// Owner-only check of the NBC (Bakong Open API) setup with the same config as
// customer payments. It creates no orders and buys nothing from FazerCards.
import { checkBakongPayment, createPaymentQr, paymentMatches } from "@/lib/bakong";
import { adminDb } from "@/lib/delivery.server";
import { bakongConfig as nbcTestConfig } from "@/lib/payment.server";

/** When the token expires, read from its own payload; the token never leaves the server. */
export function tokenExpiry(token: string): string | null {
  try {
    const part = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part)) as { exp?: unknown };
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

export type KhqrFields = {
  accountId: string | null;
  merchantName: string | null;
  currency: string | null;
  amount: string | null;
  billNumber: string | null;
};

function readTlv(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i + 4 <= text.length) {
    const tag = text.slice(i, i + 2);
    const len = Number(text.slice(i + 2, i + 4));
    if (!Number.isInteger(len)) break;
    out.set(tag, text.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return out;
}

/** The fields a payer's bank app reads from a KHQR. */
export function readKhqr(qr: string): KhqrFields {
  const top = readTlv(qr);
  const currency = top.get("53");
  return {
    accountId: readTlv(top.get("29") ?? "").get("00") ?? null,
    merchantName: top.get("59") ?? null,
    currency: currency === "840" ? "USD" : currency === "116" ? "KHR" : (currency ?? null),
    amount: top.get("54") ?? null,
    billNumber: readTlv(top.get("62") ?? "").get("01") ?? null,
  };
}

/** The Cloudflare data center running this request (e.g. SIN). */
async function workerColo(): Promise<string | null> {
  try {
    const text = await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text();
    return /^colo=(.+)$/m.exec(text)?.[1] ?? null;
  } catch {
    return null;
  }
}

const NOT_SET = "Add the BAKONG_NBC_TOKEN (eyJ…) and BAKONG_NBC_ACCOUNT_ID secrets first.";

export async function createNbcTestQr(amount: number) {
  const cfg = nbcTestConfig();
  if (!cfg) return { ok: false as const, message: NOT_SET };
  const qr = await createPaymentQr(cfg, { amount, billNumber: "NBCTEST" });
  return {
    ok: true as const,
    qr: qr.qr,
    md5: qr.md5,
    expiresAt: new Date(qr.expiresAt).toISOString(),
    fields: readKhqr(qr.qr),
    expected: { accountId: cfg.accountId, merchantName: cfg.merchantName, currency: "USD", amount },
    tokenExpires: tokenExpiry(cfg.token),
    colo: await workerColo(),
  };
}

export async function checkNbcTestQr(md5: string, amount: number) {
  const cfg = nbcTestConfig();
  if (!cfg) return { ok: false as const, message: NOT_SET };
  const colo = await workerColo();
  const check = await checkBakongPayment(cfg, md5);
  if (check.status !== "paid") return { ok: true as const, colo, ...check };
  // A bank transaction already linked to an order can never pay another one
  // (unique orders.payment_hash): show whether this one is.
  const { count } = check.hash
    ? await adminDb()
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_hash", check.hash)
    : { count: null };
  return {
    ok: true as const,
    colo,
    status: check.status,
    amount: check.amount,
    currency: check.currency,
    toAccountId: check.toAccountId,
    hashEnd: check.hash ? check.hash.slice(-8) : null,
    matches: paymentMatches(check, { amount, accountId: cfg.accountId }),
    ordersWithThisHash: count,
  };
}
