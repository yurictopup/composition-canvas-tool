// Bakong KHQR payments. Server-side only: the token must never reach the browser.
// Two token kinds work:
//  - an NBC developer token (eyJ…): the QR is built here and checked at
//    api-bakong.nbc.gov.kh, which only answers Cambodian IP addresses, so a
//    BAKONG_API_URL proxy in Cambodia may be needed;
//  - a KHQR.dev token (rbk…): KHQR.dev builds and checks the QR from anywhere.
import { createHash } from "node:crypto";
import { buildKhqr } from "@/lib/khqr";

type Fetch = typeof fetch;

export type BakongConfig = {
  token: string;
  accountId: string;
  merchantName: string;
  apiUrl?: string | undefined;
  fetchImpl?: Fetch;
  /** How long to wait after KHQR.dev's "too many requests" before trying again. */
  retryDelayMs?: number;
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
const RELAY_URL = "https://api.khqr.dev/v1";
const TIMEOUT_MS = 10000;
export const QR_LIFETIME_MS = 30 * 60 * 1000;
const PAID_STATUSES = new Set(["PAID", "SUCCESS", "COMPLETED"]);
// KHQR.dev makes one QR per second per shop and locks it for 3 s after a second
// one (HTTP 429), so two customers paying at once would otherwise see an error.
const RATE_LIMIT_WAIT_MS = 3200;

export function isRelayToken(token: string): boolean {
  return token.startsWith("rbk");
}

export function md5(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

function apiUrl(cfg: BakongConfig): string {
  return (cfg.apiUrl || (isRelayToken(cfg.token) ? RELAY_URL : NBC_URL)).replace(/\/+$/, "");
}

async function post(
  cfg: BakongConfig,
  path: string,
  body: unknown,
  timeoutMs = TIMEOUT_MS,
): Promise<{ status: number; json: unknown }> {
  const res = await (cfg.fetchImpl ?? fetch)(`${apiUrl(cfg)}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

export async function createPaymentQr(
  cfg: BakongConfig,
  order: { amount: number; billNumber: string },
  now = Date.now(),
): Promise<PaymentQr> {
  const expiresAt = now + QR_LIFETIME_MS;
  if (isRelayToken(cfg.token)) {
    const body = { amount: order.amount, currency: "USD", bill_number: order.billNumber };
    let { status, json } = await post(cfg, "/generate_qr", body);
    if (status === 429) {
      // Only once: spamming KHQR.dev while locked blocks the shop for 60 s.
      await new Promise((resolve) => setTimeout(resolve, cfg.retryDelayMs ?? RATE_LIMIT_WAIT_MS));
      ({ status, json } = await post(cfg, "/generate_qr", body));
    }
    const data =
      (json as {
        responseCode?: unknown;
        responseMessage?: unknown;
        data?: { qr?: unknown; md5?: unknown };
      } | null) ?? {};
    if (status >= 400 || data.responseCode !== 0 || typeof data.data?.qr !== "string") {
      const said = typeof data.responseMessage === "string" ? `: ${data.responseMessage.slice(0, 200)}` : "";
      throw new Error(`KHQR.dev could not create the QR (HTTP ${status})${said}`);
    }
    const qr = data.data.qr;
    return { qr, md5: typeof data.data.md5 === "string" ? data.data.md5 : md5(qr), expiresAt };
  }
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

/**
 * A link that opens the customer's bank app with this KHQR ready to pay (KHQR.dev
 * only). Null when it can't be made: the QR still works, so this never blocks paying.
 */
export async function createPaymentLink(cfg: BakongConfig, qr: string): Promise<string | null> {
  if (!isRelayToken(cfg.token)) return null;
  try {
    // Short wait: the QR is shown either way, the link only saves a screenshot.
    const { status, json } = await post(cfg, "/generate_deeplink_by_qr", { qr }, 4000);
    const body = (json as { responseCode?: unknown; data?: { shortLink?: unknown } } | null) ?? {};
    const link = body.data?.shortLink;
    if (status >= 400 || body.responseCode !== 0 || typeof link !== "string") return null;
    // Only real app or web links end up in the page's href.
    return /^[a-z][a-z0-9+.-]*:/i.test(link) && !/^(javascript|data|vbscript|file):/i.test(link)
      ? link
      : null;
  } catch {
    return null;
  }
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
    data?: Record<string, unknown> | null;
  };
  if (body.responseCode !== 0 || !body.data || typeof body.data !== "object") {
    // Not found yet (or not paid): keep waiting. Server errors are not "unpaid".
    return res.status >= 500
      ? { status: "unavailable", message: `Bakong returned HTTP ${res.status}.` }
      : { status: "unpaid" };
  }
  const data = body.data;
  // KHQR.dev adds a status; NBC answers only for completed payments and has none.
  // Only a known "paid" word counts: anything else (FAILED, REFUNDED, a new
  // word) is never taken as money received.
  const relayStatus = String(data["status"] ?? "").toUpperCase();
  if (relayStatus === "SCANNED" || relayStatus === "UNPAID" || relayStatus === "EXPIRED")
    return { status: "unpaid" };
  if (relayStatus !== "" && !PAID_STATUSES.has(relayStatus)) {
    return { status: "unavailable", message: `Bakong answered with status ${relayStatus}.` };
  }
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
 * A paid answer only counts when it is for the full amount in USD.
 * With our own account (NBC token) NBC always sends the currency and the
 * receiving account, so both must be there and match: a missing one is not a
 * match. accountId null = the QR came from KHQR.dev for the account linked
 * there; its answer is checked for amount, and for currency when sent.
 */
export function paymentMatches(
  check: Extract<PaymentCheck, { status: "paid" }>,
  expected: { amount: number; accountId: string | null },
): boolean {
  if (check.amount === null || Math.abs(check.amount - expected.amount) > 0.005) return false;
  if (expected.accountId === null) {
    return check.currency === null || check.currency.toUpperCase() === "USD";
  }
  return (
    check.currency?.toUpperCase() === "USD" &&
    check.toAccountId?.toLowerCase() === expected.accountId.toLowerCase()
  );
}
