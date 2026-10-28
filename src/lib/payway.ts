// ABA PayWay KHQR payments (official PayWay API). Server-side only: the API key
// signs every request and must never reach the browser.
//  - generate-qr makes a KHQR for one transaction id (tran_id);
//  - check-transaction-2 tells whether that tran_id was paid.
// Docs: https://developer.payway.com.kh/qr-api-14530840e0 and
// https://developer.payway.com.kh/check-transaction-14530826e0
import type { PaymentCheck } from "@/lib/bakong";

type Fetch = typeof fetch;

export type PaywayEnv = "sandbox" | "production";

export type PaywayConfig = {
  env: PaywayEnv;
  merchantId: string;
  apiKey: string;
  /** Display only: PayWay puts the merchant profile's own name in the QR. */
  merchantName: string;
  /** Overrides the base URL picked from env (e.g. a proxy). */
  apiUrl?: string | undefined;
  qrTemplate?: string | undefined;
  lifetimeMinutes?: number | undefined;
  fetchImpl?: Fetch;
};

export type PaywayQr = { qr: string; tranId: string; expiresAt: number };

const BASE_URLS: Record<PaywayEnv, string> = {
  sandbox: "https://checkout-sandbox.payway.com.kh",
  production: "https://checkout.payway.com.kh",
};
const QR_PATH = "/api/payment-gateway/v1/payments/generate-qr";
const CHECK_PATH = "/api/payment-gateway/v1/payments/check-transaction-2";
const TIMEOUT_MS = 10000;
const DEFAULT_LIFETIME_MIN = 30;
const DEFAULT_TEMPLATE = "template3_color";

/** UTC time as YYYYMMDDHHmmss, the format PayWay wants in req_time. */
export function reqTime(now = Date.now()): string {
  return new Date(now).toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/**
 * base64(HMAC-SHA512(values joined with nothing, api key)). Web Crypto, which
 * Cloudflare Workers run natively.
 */
export async function paywayHash(apiKey: string, values: Array<string | number>): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(values.join(""))));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * A transaction id PayWay has never seen (it refuses a reused one, code 403):
 * the order's short code plus the time, at most 20 characters.
 */
export function makeTranId(orderId: string, now = Date.now()): string {
  const code = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${code}${now.toString(36).toUpperCase()}`.slice(0, 20);
}

/** Amounts are signed as text, so the body and the hash must spell them the same way. */
export function formatAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function baseUrl(cfg: PaywayConfig): string {
  return (cfg.apiUrl || BASE_URLS[cfg.env]).replace(/\/+$/, "");
}

async function post(
  cfg: PaywayConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const res = await (cfg.fetchImpl ?? fetch)(`${baseUrl(cfg)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

type PaywayStatus = { code?: unknown; message?: unknown };

function statusCode(json: unknown): string {
  const status = (json as { status?: PaywayStatus } | null)?.status;
  return String(status?.code ?? "");
}

function statusMessage(json: unknown): string {
  const status = (json as { status?: PaywayStatus } | null)?.status;
  return typeof status?.message === "string" ? status.message : "";
}

export async function createPaywayQr(
  cfg: PaywayConfig,
  order: { orderId: string; amount: number },
  now = Date.now(),
): Promise<PaywayQr> {
  const lifetime = cfg.lifetimeMinutes ?? DEFAULT_LIFETIME_MIN;
  const template = cfg.qrTemplate || DEFAULT_TEMPLATE;
  const tranId = makeTranId(order.orderId, now);
  const amount = formatAmount(order.amount);
  const fields = {
    req_time: reqTime(now),
    merchant_id: cfg.merchantId,
    tran_id: tranId,
    amount,
    payment_option: "abapay_khqr",
    currency: "USD",
    lifetime,
    qr_image_template: template,
  };
  // Hash order from the docs; optional fields we don't send count as "".
  const hash = await paywayHash(cfg.apiKey, [
    fields.req_time,
    fields.merchant_id,
    fields.tran_id,
    fields.amount,
    "", // items
    "", // first_name
    "", // last_name
    "", // email
    "", // phone
    "", // purchase_type
    fields.payment_option,
    "", // callback_url
    "", // return_deeplink
    fields.currency,
    "", // custom_fields
    "", // return_params
    "", // payout
    fields.lifetime,
    fields.qr_image_template,
  ]);
  const { status, json } = await post(cfg, QR_PATH, {
    ...fields,
    amount: Number(amount),
    hash,
  });
  const qr = (json as { qrString?: unknown } | null)?.qrString;
  if (status >= 400 || statusCode(json) !== "0" || typeof qr !== "string" || !qr) {
    const code = statusCode(json) || "none";
    const msg = statusMessage(json);
    throw new Error(
      `PayWay could not create the QR (HTTP ${status}, code ${code}${msg ? `: ${msg}` : ""}).`,
    );
  }
  return { qr, tranId, expiresAt: now + lifetime * 60_000 };
}

/** Asks PayWay whether the transaction was paid. Only APPROVED counts as paid. */
export async function checkPaywayTransaction(
  cfg: PaywayConfig,
  tranId: string,
  now = Date.now(),
): Promise<PaymentCheck> {
  const time = reqTime(now);
  let res: { status: number; json: unknown };
  try {
    res = await post(cfg, CHECK_PATH, {
      req_time: time,
      merchant_id: cfg.merchantId,
      tran_id: tranId,
      hash: await paywayHash(cfg.apiKey, [time, cfg.merchantId, tranId]),
    });
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const code = statusCode(res.json);
  // 6 = not found: no payment made against it yet.
  if (code === "6") return { status: "unpaid" };
  if (res.status >= 400 || code !== "00") {
    const msg = statusMessage(res.json);
    return {
      status: "unavailable",
      message: `PayWay check failed (HTTP ${res.status}, code ${code || "none"}${msg ? `: ${msg}` : ""}).`,
    };
  }
  const data = ((res.json as { data?: Record<string, unknown> | null } | null)?.data ??
    {}) as Record<string, unknown>;
  const paymentStatus = String(data["payment_status"] ?? "").toUpperCase();
  // PRE-AUTH also has code 0 but is only a hold, not money received.
  if (Number(data["payment_status_code"]) !== 0 || paymentStatus !== "APPROVED") {
    return { status: "unpaid" };
  }
  // Refunded money is not ours to deliver for.
  if (Number(data["refund_amount"] ?? 0) > 0) return { status: "unpaid" };
  if (!(Number(data["payment_amount"]) > 0)) return { status: "unpaid" };
  // total_amount is in the QR's currency (USD). The payer's own currency can be
  // KHR (ABA converts), so payment_amount is only compared when it is USD too.
  const currency = String(data["payment_currency"] ?? "").toUpperCase();
  const total = Number(currency === "USD" ? data["payment_amount"] : data["total_amount"]);
  return {
    status: "paid",
    amount: Number.isFinite(total) ? total : null,
    currency: null,
    toAccountId: null,
    hash: typeof data["apv"] === "string" && data["apv"] ? `payway:${tranId}:${data["apv"]}` : null,
  };
}
