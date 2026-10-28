// One interface for every way the shop takes KHQR payments, so the bank can be
// changed by a setting instead of a rewrite. Server-side only.
//
// PAYMENT_PROVIDER picks who makes new QRs: "bakong" (default: the live
// KHQR.dev / NBC path) or "payway" (ABA PayWay). Each order keeps the
// provider's reference in orders.payment_md5; PayWay ones start with "payway:",
// so a QR made before a switch is still checked with the provider that made it.
import {
  checkBakongPayment,
  createPaymentQr,
  isRelayToken,
  type BakongConfig,
  type PaymentCheck,
} from "@/lib/bakong";
import {
  checkPaywayTransaction,
  createPaywayQr,
  type PaywayConfig,
  type PaywayEnv,
} from "@/lib/payway";

export type ProviderName = "bakong" | "payway";

export type ProviderQr = { qr: string; ref: string; expiresAt: number };

export interface PaymentProvider {
  name: ProviderName;
  /** Shown in orders.payment and to the customer. */
  label: string;
  /** The merchant name shown on the QR card; null keeps the page's default. */
  merchantName: string | null;
  /** Sandbox money is not real: such payments never mark an order paid or deliver. */
  sandbox: boolean;
  /** The account a paid answer must name, or null when the provider's QR already fixes it. */
  expectedAccountId: string | null;
  createQr(order: { orderId: string; amount: number }): Promise<ProviderQr>;
  check(ref: string): Promise<PaymentCheck>;
}

const PAYWAY_PREFIX = "payway:";

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

/** Sandbox unless PAYWAY_ENV is exactly "production", so real money needs a deliberate switch. */
export function paywayConfig(): PaywayConfig | null {
  const merchantId = process.env["PAYWAY_MERCHANT_ID"];
  const apiKey = process.env["PAYWAY_API_KEY"];
  if (!merchantId || !apiKey) return null;
  const env: PaywayEnv = process.env["PAYWAY_ENV"] === "production" ? "production" : "sandbox";
  const lifetime = Number(process.env["PAYWAY_QR_LIFETIME_MIN"]);
  return {
    env,
    merchantId,
    apiKey,
    merchantName: process.env["PAYWAY_MERCHANT_NAME"] || "YURIC SHOP",
    apiUrl: process.env["PAYWAY_API_URL"],
    qrTemplate: process.env["PAYWAY_QR_TEMPLATE"],
    lifetimeMinutes: Number.isFinite(lifetime) && lifetime >= 3 ? lifetime : undefined,
  };
}

export function bakongProvider(cfg: BakongConfig): PaymentProvider {
  return {
    name: "bakong",
    label: "Bakong",
    merchantName: null,
    sandbox: false,
    // With a KHQR.dev token the QR is made by KHQR.dev for the account linked
    // there (e.g. an ABA merchant), so only the amount is compared.
    expectedAccountId: isRelayToken(cfg.token) ? null : cfg.accountId,
    async createQr({ orderId, amount }) {
      const qr = await createPaymentQr(cfg, {
        amount,
        billNumber: orderId.slice(0, 8).toUpperCase(),
      });
      return { qr: qr.qr, ref: qr.md5, expiresAt: qr.expiresAt };
    },
    check: (ref) => checkBakongPayment(cfg, ref),
  };
}

export function paywayProvider(cfg: PaywayConfig): PaymentProvider {
  return {
    name: "payway",
    label: "ABA PayWay",
    // The bank shows the name on the PayWay merchant profile; keep this the same.
    merchantName: cfg.merchantName,
    sandbox: cfg.env !== "production",
    expectedAccountId: null,
    async createQr(order) {
      const qr = await createPaywayQr(cfg, order);
      return { qr: qr.qr, ref: `${PAYWAY_PREFIX}${qr.tranId}`, expiresAt: qr.expiresAt };
    },
    check: (ref) => checkPaywayTransaction(cfg, ref.slice(PAYWAY_PREFIX.length)),
  };
}

function byName(name: ProviderName): PaymentProvider | null {
  if (name === "payway") {
    const cfg = paywayConfig();
    return cfg ? paywayProvider(cfg) : null;
  }
  const cfg = bakongConfig();
  return cfg ? bakongProvider(cfg) : null;
}

/** The provider that makes new QRs, or null when it isn't set up. */
export function activeProvider(): PaymentProvider | null {
  return byName(process.env["PAYMENT_PROVIDER"] === "payway" ? "payway" : "bakong");
}

/** The provider that made a stored QR reference. */
export function providerForRef(ref: string): PaymentProvider | null {
  return byName(ref.startsWith(PAYWAY_PREFIX) ? "payway" : "bakong");
}
