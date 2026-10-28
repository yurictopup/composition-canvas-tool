import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkBakongPayment,
  createPaymentQr,
  isRelayToken,
  paymentMatches,
  type BakongConfig,
} from "@/lib/bakong";
import { deliverPaidOrder } from "@/lib/delivery.server";

export type PaymentState = {
  available: boolean;
  qr?: string;
  amount?: number;
  expiresAt?: string;
  paid: boolean;
  status?: string;
  message?: string;
};

export function bakongConfig(): BakongConfig | null {
  const token = process.env["BAKONG_TOKEN"];
  const accountId = process.env["BAKONG_ACCOUNT_ID"];
  if (!token || !accountId) return null;
  return {
    token,
    accountId,
    merchantName: process.env["BAKONG_MERCHANT_NAME"] || "Yuric Topup",
    apiUrl: process.env["BAKONG_API_URL"],
  };
}

type PayOrder = {
  id: string;
  user_id: string | null;
  status: string;
  price_usd: number | string;
  payment_qr: string | null;
  payment_md5: string | null;
  payment_expires_at: string | null;
  paid_at: string | null;
};

/** Whose order may be loaded: a user id, "guest" (a guest order whose link was checked), or null = the owner, any order. */
export type OrderScope = string | null;

async function loadOrder(db: SupabaseClient, orderId: string, scope: OrderScope) {
  let query = db
    .from("orders")
    .select("id, user_id, status, price_usd, payment_qr, payment_md5, payment_expires_at, paid_at")
    .eq("id", orderId);
  if (scope === "guest") query = query.is("user_id", null);
  else if (scope) query = query.eq("user_id", scope);
  const { data } = await query.maybeSingle();
  return (data as PayOrder | null) ?? null;
}

function paidState(order: { status: string }): PaymentState {
  return { available: true, paid: true, status: order.status };
}

/** The KHQR for an unpaid order, made once and reused until it expires. */
export async function startOrderPayment(
  db: SupabaseClient,
  orderId: string,
  scope: Exclude<OrderScope, null>,
): Promise<PaymentState> {
  const cfg = bakongConfig();
  if (!cfg) return { available: false, paid: false };
  const order = await loadOrder(db, orderId, scope);
  if (!order) return { available: true, paid: false, message: "Order not found." };
  if (order.paid_at) return paidState(order);
  if (order.status !== "pending") {
    return {
      available: true,
      paid: false,
      status: order.status,
      message: "This order is not waiting for payment.",
    };
  }
  const amount = Number(order.price_usd);
  if (
    order.payment_qr &&
    order.payment_expires_at &&
    new Date(order.payment_expires_at).getTime() > Date.now() + 60_000
  ) {
    return {
      available: true,
      paid: false,
      qr: order.payment_qr,
      amount,
      expiresAt: order.payment_expires_at,
    };
  }

  const qr = await createPaymentQr(cfg, { amount, billNumber: order.id.slice(0, 8).toUpperCase() });
  const expiresAt = new Date(qr.expiresAt).toISOString();
  await db
    .from("orders")
    .update({ payment_qr: qr.qr, payment_md5: qr.md5, payment_expires_at: expiresAt })
    .eq("id", order.id)
    .is("paid_at", null);
  return { available: true, paid: false, qr: qr.qr, amount, expiresAt };
}

/**
 * Asks Bakong whether the order's KHQR was paid; the first caller to see it
 * paid marks the order and starts the GamesDrop delivery.
 * scope null = the owner checking any order.
 */
export async function checkOrderPayment(
  db: SupabaseClient,
  orderId: string,
  scope: OrderScope,
): Promise<PaymentState> {
  const cfg = bakongConfig();
  if (!cfg) return { available: false, paid: false };
  const order = await loadOrder(db, orderId, scope);
  if (!order) return { available: true, paid: false, message: "Order not found." };
  if (order.paid_at) return paidState(order);
  if (!order.payment_md5)
    return { available: true, paid: false, message: "No KHQR for this order yet." };

  const check = await checkBakongPayment(cfg, order.payment_md5);
  if (check.status === "unavailable")
    return { available: true, paid: false, message: check.message };
  if (check.status === "unpaid") return { available: true, paid: false };

  const amount = Number(order.price_usd);
  // With a KHQR.dev token the QR is made by KHQR.dev for the account linked
  // there (e.g. an ABA merchant), so only the amount is compared.
  const accountId = isRelayToken(cfg.token) ? null : cfg.accountId;
  if (!paymentMatches(check, { amount, accountId })) {
    return {
      available: true,
      paid: false,
      message: "Bakong shows a payment that doesn't match this order. The shop will check it.",
    };
  }

  const { data: marked } = await db
    .from("orders")
    .update({ paid_at: new Date().toISOString(), payment_hash: check.hash })
    .eq("id", order.id)
    .is("paid_at", null)
    .select("id")
    .maybeSingle();
  if (!marked) return paidState(order); // another check got there first

  try {
    const delivery = await deliverPaidOrder(db, order.id);
    return { available: true, paid: true, status: delivery.status ?? "processing" };
  } catch (error) {
    // Paid but not delivered (e.g. GamesDrop not set up): the owner sees it as paid and pending.
    console.error("[payment] delivery failed", error instanceof Error ? error.message : error);
    return { available: true, paid: true, status: "pending" };
  }
}
