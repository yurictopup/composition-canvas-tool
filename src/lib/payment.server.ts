import type { SupabaseClient } from "@supabase/supabase-js";
import { paymentMatches } from "@/lib/bakong";
import { deliverPaidOrder } from "@/lib/delivery.server";
import { activeProvider, providerForRef, type PaymentProvider } from "@/lib/payment-provider";

export { bakongConfig } from "@/lib/payment-provider";

export type PaymentState = {
  available: boolean;
  qr?: string;
  amount?: number;
  expiresAt?: string;
  paid: boolean;
  status?: string;
  message?: string;
  /** Who made the QR, e.g. "Bakong" or "ABA PayWay". */
  provider?: string;
  /** The merchant name the bank shows for this QR, when the provider sets one. */
  merchant?: string;
  /** A PayWay Sandbox test: no real money, the order is not marked paid. */
  sandbox?: boolean;
};

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

function providerInfo(provider: PaymentProvider): Partial<PaymentState> {
  return {
    provider: provider.label,
    ...(provider.merchantName ? { merchant: provider.merchantName } : {}),
    ...(provider.sandbox ? { sandbox: true } : {}),
  };
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
  const provider = activeProvider();
  if (!provider) return { available: false, paid: false };
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
  // A QR still valid is reused, unless the shop has since switched provider.
  const current = order.payment_md5 ? providerForRef(order.payment_md5) : null;
  if (
    order.payment_qr &&
    order.payment_expires_at &&
    current?.name === provider.name &&
    new Date(order.payment_expires_at).getTime() > Date.now() + 60_000
  ) {
    return {
      available: true,
      paid: false,
      qr: order.payment_qr,
      amount,
      expiresAt: order.payment_expires_at,
      ...providerInfo(provider),
    };
  }

  // The old QR may have been paid just before it expired (or the customer came
  // back later): ask about it before its reference is replaced and forgotten.
  if (order.payment_md5 && current) {
    const settled = await settlePayment(db, current, order, order.payment_md5);
    if (settled.paid) return settled;
  }

  const qr = await provider.createQr({ orderId: order.id, amount });
  const expiresAt = new Date(qr.expiresAt).toISOString();
  await db
    .from("orders")
    .update({
      payment_qr: qr.qr,
      payment_md5: qr.ref,
      payment_expires_at: expiresAt,
      payment: provider.label,
    })
    .eq("id", order.id)
    .is("paid_at", null);
  return {
    available: true,
    paid: false,
    qr: qr.qr,
    amount,
    expiresAt,
    ...providerInfo(provider),
  };
}

/**
 * Asks the provider that made the order's KHQR whether it was paid; the first caller to see it
 * paid marks the order and starts the FazerCards delivery.
 * scope null = the owner checking any order.
 */
export async function checkOrderPayment(
  db: SupabaseClient,
  orderId: string,
  scope: OrderScope,
): Promise<PaymentState> {
  if (!activeProvider()) return { available: false, paid: false };
  const order = await loadOrder(db, orderId, scope);
  if (!order) return { available: true, paid: false, message: "Order not found." };
  if (order.paid_at) return paidState(order);
  if (!order.payment_md5)
    return { available: true, paid: false, message: "No KHQR for this order yet." };
  const provider = providerForRef(order.payment_md5);
  if (!provider)
    return { available: true, paid: false, message: "The payment provider is not set up." };

  return settlePayment(db, provider, order, order.payment_md5);
}

/** Asks the provider about the order's current KHQR; when paid, marks it and starts the delivery. */
async function settlePayment(
  db: SupabaseClient,
  provider: PaymentProvider,
  order: PayOrder,
  ref: string,
): Promise<PaymentState> {
  const check = await provider.check(ref);
  if (check.status === "unavailable")
    return { available: true, paid: false, message: check.message };
  if (check.status === "unpaid") return { available: true, paid: false };

  const amount = Number(order.price_usd);
  if (!paymentMatches(check, { amount, accountId: provider.expectedAccountId })) {
    return {
      available: true,
      paid: false,
      message: `${provider.label} shows a payment that doesn't match this order. The shop will check it.`,
    };
  }

  // Sandbox money is not real: show that the flow worked, but never mark the
  // order paid or buy from FazerCards.
  if (provider.sandbox) {
    console.log("[payment] sandbox payment confirmed, order left unpaid", order.id);
    return {
      available: true,
      paid: true,
      sandbox: true,
      status: "sandbox",
      provider: provider.label,
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
