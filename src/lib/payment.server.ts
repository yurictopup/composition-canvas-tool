import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkBakongPayment,
  checkBakongPayments,
  createPaymentQr,
  MD5_LIST_MAX,
  paymentMatches,
  type BakongConfig,
  type PaymentCheck,
} from "@/lib/bakong";
import { deliverPaidOrder } from "@/lib/delivery.server";
import { salesOpenFor } from "@/lib/store-status";

export type PaymentState = {
  available: boolean;
  qr?: string;
  amount?: number;
  expiresAt?: string;
  paid: boolean;
  status?: string;
  message?: string;
  /** Gift card codes of a delivered order (Roblox), shown only to the order's buyer. */
  codes?: string[];
};

// The NBC token and the shop's own Bakong account, from Worker secrets.
export function bakongConfig(): BakongConfig | null {
  const token = process.env["BAKONG_NBC_TOKEN"];
  const accountId = process.env["BAKONG_NBC_ACCOUNT_ID"];
  if (!token || !accountId) return null;
  return {
    token,
    accountId,
    merchantName: process.env["BAKONG_NBC_MERCHANT_NAME"] || "Yuric Store",
    apiUrl: process.env["BAKONG_NBC_API_URL"],
    proxyKey: process.env["BAKONG_NBC_PROXY_KEY"],
  };
}

type PayOrder = {
  id: string;
  user_id: string | null;
  game_id: string;
  status: string;
  price_usd: number | string;
  payment_qr: string | null;
  payment_md5: string | null;
  payment_expires_at: string | null;
  paid_at: string | null;
  delivery_codes?: string[] | null;
};

/** Whose order may be loaded: a user id, "guest" (a guest order whose link was checked), or null = the owner, any order. */
export type OrderScope = string | null;

async function loadOrder(db: SupabaseClient, orderId: string, scope: OrderScope) {
  let query = db
    .from("orders")
    .select(
      "id, user_id, game_id, status, price_usd, payment_qr, payment_md5, payment_expires_at, paid_at, delivery_codes",
    )
    .eq("id", orderId);
  if (scope === "guest") query = query.is("user_id", null);
  else if (scope) query = query.eq("user_id", scope);
  const { data } = await query.maybeSingle();
  return (data as PayOrder | null) ?? null;
}

function paidState(order: { status: string; delivery_codes?: string[] | null }): PaymentState {
  const codes = order.delivery_codes ?? [];
  return { available: true, paid: true, status: order.status, ...(codes.length ? { codes } : {}) };
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

  // The old QR may have been paid just before it expired (or the customer came
  // back later): ask Bakong about it before its md5 is replaced and forgotten.
  if (order.payment_md5) {
    const settled = await settlePayment(db, cfg, order, order.payment_md5);
    if (settled.paid) return settled;
  }

  // Sales paused on /admin: no new KHQR for old unpaid orders either.
  if (!(await salesOpenFor(db, order.game_id))) {
    return {
      available: true,
      paid: false,
      message: "Sales are paused right now. Please come back soon.",
    };
  }

  const qr = await createPaymentQr(cfg, { amount, billNumber: order.id.slice(0, 8).toUpperCase() });
  const expiresAt = new Date(qr.expiresAt).toISOString();
  // Remember every QR this order was given, so a payment made later with an
  // older one (a screenshot, an app that ignores the expiry) is still found.
  const { error: keepError } = await db
    .from("order_payments")
    .insert({ md5: qr.md5, order_id: order.id, expires_at: expiresAt });
  if (keepError) console.error("[payment] could not keep the QR", order.id, keepError.message);
  await db
    .from("orders")
    .update({ payment_qr: qr.qr, payment_md5: qr.md5, payment_expires_at: expiresAt })
    .eq("id", order.id)
    .is("paid_at", null);
  return { available: true, paid: false, qr: qr.qr, amount, expiresAt };
}

/**
 * Asks Bakong whether the order's KHQR was paid; the first caller to see it
 * paid marks the order and starts the FazerCards delivery.
 * scope null = the owner checking any order.
 */
export async function checkOrderPayment(
  db: SupabaseClient,
  orderId: string,
  scope: OrderScope,
  {
    beforeBankCheck,
  }: {
    /** False skips the Bakong call this time (the order was asked about a moment ago). */
    beforeBankCheck?: () => Promise<boolean>;
  } = {},
): Promise<PaymentState> {
  const cfg = bakongConfig();
  if (!cfg) return { available: false, paid: false };
  const order = await loadOrder(db, orderId, scope);
  if (!order) return { available: true, paid: false, message: "Order not found." };
  if (order.paid_at) return paidState(order);
  if (!order.payment_md5)
    return { available: true, paid: false, message: "No KHQR for this order yet." };
  // Not paid as of a few seconds ago; the next poll (or the cron) asks again.
  if (beforeBankCheck && !(await beforeBankCheck())) return { available: true, paid: false };

  return settlePayment(db, cfg, order, order.payment_md5);
}

// Shown when the shop's NBC requests for the day are used up.
const BUSY =
  "We're confirming your payment. If you paid, your order is safe: the shop will confirm it shortly.";

/** One NBC check, if the shop's daily NBC budget allows it. */
async function askBakong(cfg: BakongConfig, md5: string): Promise<PaymentCheck> {
  const { nbcBudgetAllowed } = await import("@/lib/rate-limit.server");
  if (!(await nbcBudgetAllowed())) return { status: "unavailable", message: BUSY };
  return checkBakongPayment(cfg, md5);
}

/**
 * Asks Bakong about the order's KHQR (or uses `known`, the answer of the cron's
 * list check); when paid, marks it and starts the delivery.
 */
async function settlePayment(
  db: SupabaseClient,
  cfg: BakongConfig,
  order: PayOrder,
  md5: string,
  known?: PaymentCheck,
): Promise<PaymentState> {
  const check = known ?? (await askBakong(cfg, md5));
  if (check.status === "unavailable")
    return { available: true, paid: false, message: check.message };
  if (check.status === "unpaid") return { available: true, paid: false };

  const amount = Number(order.price_usd);
  if (!paymentMatches(check, { amount, accountId: cfg.accountId })) {
    return {
      available: true,
      paid: false,
      message: "Bakong shows a payment that doesn't match this order. The shop will check it.",
    };
  }

  const { data: marked, error: markError } = await db
    .from("orders")
    .update({ paid_at: new Date().toISOString(), payment_hash: check.hash })
    .eq("id", order.id)
    .is("paid_at", null)
    .select("id")
    .maybeSingle();
  if (markError) {
    // 23505: this bank transaction already paid another order (orders_payment_hash_idx).
    // Never deliver twice for one payment; the owner looks at it.
    console.error(
      "[payment] could not mark order paid",
      order.id,
      markError.code,
      markError.message,
    );
    return {
      available: true,
      paid: false,
      message:
        markError.code === "23505"
          ? "This payment was already used for another order. The shop will check it."
          : "Could not confirm the payment right now. Please try again in a moment.",
    };
  }
  if (marked) {
    // Which of the order's QRs was paid (for the owner); never blocks delivery.
    await db
      .from("order_payments")
      .update({ paid_at: new Date().toISOString() })
      .eq("md5", md5)
      .then(
        () => undefined,
        () => undefined,
      );
  }
  if (!marked) {
    // Another check got there first: report what the database says now.
    const { data: now } = await db
      .from("orders")
      .select("status, paid_at")
      .eq("id", order.id)
      .maybeSingle();
    return now?.paid_at ? paidState(now) : { available: true, paid: false };
  }

  try {
    const delivery = await deliverPaidOrder(db, order.id);
    // A gift card code is usually ready at once; send it back with this answer.
    const { data: done } = await db
      .from("orders")
      .select("status, delivery_codes")
      .eq("id", order.id)
      .maybeSingle();
    return done ? paidState(done) : { available: true, paid: true, status: delivery.status ?? "processing" };
  } catch (error) {
    // Paid but not delivered (e.g. GamesDrop not set up): the owner sees it as paid and pending.
    console.error("[payment] delivery failed", error instanceof Error ? error.message : error);
    return { available: true, paid: true, status: "pending" };
  }
}

/** Older QRs are asked about for this long after they were made. */
export const EARLIER_QR_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Asks Bakong about one of the order's expired QRs (replaced or not). Used by
 * the cron: the customer's page only polls the newest live QR. Does nothing
 * once the order is paid or no longer waiting for payment.
 */
export async function checkEarlierQr(
  db: SupabaseClient,
  orderId: string,
  md5: string,
): Promise<PaymentState> {
  const cfg = bakongConfig();
  if (!cfg) return { available: false, paid: false };
  const order = await loadOrder(db, orderId, null);
  if (!order) return { available: true, paid: false, message: "Order not found." };
  if (order.paid_at) return paidState(order);
  // The newest QR counts too: once it expired, only this sweep still asks about it.
  if (order.status !== "pending") return { available: true, paid: false };
  return settlePayment(db, cfg, order, md5);
}

/** New orders' QRs are in every 15-minute list check for this long. */
export const RECENT_QR_WINDOW_MS = 60 * 60 * 1000;

/**
 * The cron's payment check: every unpaid QR of the last day in ONE NBC request
 * (NBC allows 100 a day), then each paid one is marked and delivered exactly
 * as when the customer's page sees it. Runs every 15 minutes while an order
 * from the last hour waits, otherwise every 6 hours.
 */
export async function sweepBakongPayments(
  db: SupabaseClient,
  now = Date.now(),
): Promise<{ checked: number; paid: number }> {
  const cfg = bakongConfig();
  if (!cfg) return { checked: 0, paid: 0 };
  const { data } = await db
    .from("order_payments")
    .select("md5, order_id, created_at")
    .is("paid_at", null)
    .gt("created_at", new Date(now - EARLIER_QR_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(MD5_LIST_MAX);
  const rows = (data ?? []) as { md5: string; order_id: string; created_at: string }[];
  if (!rows.length) return { checked: 0, paid: 0 };

  const recent = rows.some((r) => Date.parse(r.created_at) > now - RECENT_QR_WINDOW_MS);
  const { rule } = await import("@/lib/rate-limit");
  const { checkLimits, nbcBudgetAllowed } = await import("@/lib/rate-limit.server");
  const gate = rule(recent ? "nbcSweepRecent" : "nbcSweepOld", "all");
  if (!(await checkLimits([gate])).allowed || !(await nbcBudgetAllowed())) {
    return { checked: 0, paid: 0 };
  }

  const answer = await checkBakongPayments(
    cfg,
    rows.map((r) => r.md5),
  );
  if (answer.status !== "ok") {
    console.error("[sweep] bakong list check", answer.message);
    return { checked: rows.length, paid: 0 };
  }
  let paid = 0;
  for (const row of rows) {
    const check = answer.paid.get(row.md5);
    if (!check) continue;
    const order = await loadOrder(db, row.order_id, null);
    if (!order || order.paid_at || order.status !== "pending") continue;
    if ((await settlePayment(db, cfg, order, row.md5, check)).paid) paid++;
  }
  return { checked: rows.length, paid };
}
