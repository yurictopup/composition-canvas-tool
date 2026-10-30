// Bakong KHQR payments with an NBC Bakong Open API token (eyJ…, renewed every
// 90 days). Server-side only: the token must never reach the browser. The QR
// is built here for the shop's own Bakong account and checked at
// api-bakong.nbc.gov.kh, which blocks some foreign addresses; it answered
// Cloudflare Workers in tests. An optional apiUrl points at another gateway.
import { createHash } from "node:crypto";
import { buildKhqr } from "@/lib/khqr";

type Fetch = typeof fetch;

export type BakongConfig = {
  token: string;
  accountId: string;
  merchantName: string;
  apiUrl?: string | undefined;
  fetchImpl?: Fetch;
};

export type PaymentQr = { qr: string; md5: string; expiresAt: number };

export type PaymentCheck =
  | {
      status: "paid";
      amount: number | null;
      currency: string | null;
      toAccountId: string | null;
      hash: string | null;
    }
  | { status: "unpaid" }
  | { status: "unavailable"; message: string };

const NBC_URL = "https://api-bakong.nbc.gov.kh/v1";
const TIMEOUT_MS = 10000;
export const QR_LIFETIME_MS = 30 * 60 * 1000;

export function md5(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

function apiUrl(cfg: BakongConfig): string {
  return (cfg.apiUrl || NBC_URL).replace(/\/+$/, "");
}

async function post(
  cfg: BakongConfig,
  path: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await (cfg.fetchImpl ?? fetch)(`${apiUrl(cfg)}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

export async function createPaymentQr(
  cfg: BakongConfig,
  order: { amount: number; billNumber: string },
  now = Date.now(),
): Promise<PaymentQr> {
  const expiresAt = now + QR_LIFETIME_MS;
  const qr = buildKhqr({
    accountId: cfg.accountId,
    merchantName: cfg.merchantName,
    amount: order.amount,
    currency: "USD",
    billNumber: order.billNumber,
    createdAt: now,
    expiresAt,
  });
  return { qr, md5: md5(qr), expiresAt };
}

export async function checkBakongPayment(cfg: BakongConfig, qrMd5: string): Promise<PaymentCheck> {
  let res: { status: number; json: unknown };
  try {
    res = await post(cfg, "/check_transaction_by_md5", { md5: qrMd5 });
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  if (res.status === 401)
    return { status: "unavailable", message: "Bakong token is wrong or expired." };
  if (res.status === 403) {
    return {
      status: "unavailable",
      message: "Bakong only accepts requests from Cambodian IP addresses.",
    };
  }
  const body = (res.json ?? {}) as {
    responseCode?: unknown;
    responseMessage?: unknown;
    errorCode?: unknown;
    data?: Record<string, unknown> | null;
  };
  if (res.status >= 500) {
    return { status: "unavailable", message: `Bakong returned HTTP ${res.status}.` };
  }
  if (body.responseCode !== 0 || !body.data || typeof body.data !== "object") {
    // Only "transaction not found" (errorCode 1) means not paid yet. Anything
    // else, e.g. 19 "Daily request limit of 100 exceeded", is NBC refusing to
    // answer, never a sign the customer didn't pay.
    if (body.errorCode === 1 || body.errorCode === undefined) return { status: "unpaid" };
    const said = typeof body.responseMessage === "string" ? body.responseMessage : "";
    return {
      status: "unavailable",
      message: `Bakong error ${String(body.errorCode)}${said ? `: ${said}` : ""}`,
    };
  }
  // NBC answers with data only for a completed payment.
  const data = body.data;
  const amount = Number(data["amount"]);
  return {
    status: "paid",
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof data["currency"] === "string" ? data["currency"] : null,
    toAccountId: typeof data["toAccountId"] === "string" ? data["toAccountId"] : null,
    hash: typeof data["hash"] === "string" ? data["hash"] : null,
  };
}

/**
 * A paid answer only counts when it is for the full amount in USD to the
 * shop's account. NBC always sends the currency and the receiving account, so
 * both must be there and match: a missing one is not a match.
 */
export function paymentMatches(
  check: Extract<PaymentCheck, { status: "paid" }>,
  expected: { amount: number; accountId: string },
): boolean {
  if (check.amount === null || Math.abs(check.amount - expected.amount) > 0.005) return false;
  return (
    check.currency?.toUpperCase() === "USD" &&
    check.toAccountId?.toLowerCase() === expected.accountId.toLowerCase()
  );
}
