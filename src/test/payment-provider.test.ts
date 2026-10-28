import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const createPaymentQr = vi.fn();
const checkBakongPayment = vi.fn();
const createPaywayQr = vi.fn();
const checkPaywayTransaction = vi.fn();
const deliverPaidOrder = vi.fn();

vi.mock("@/lib/bakong", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bakong")>()),
  createPaymentQr: (...a: unknown[]) => createPaymentQr(...a),
  checkBakongPayment: (...a: unknown[]) => checkBakongPayment(...a),
}));
vi.mock("@/lib/payway", () => ({
  createPaywayQr: (...a: unknown[]) => createPaywayQr(...a),
  checkPaywayTransaction: (...a: unknown[]) => checkPaywayTransaction(...a),
}));
vi.mock("@/lib/delivery.server", () => ({
  deliverPaidOrder: (...a: unknown[]) => deliverPaidOrder(...a),
}));

const { startOrderPayment, checkOrderPayment } = await import("@/lib/payment.server");
const { activeProvider, providerForRef } = await import("@/lib/payment-provider");

const ORDER_ID = "3c82a19d-0000-4000-8000-000000000001";
const ENV_KEYS = [
  "PAYMENT_PROVIDER",
  "PAYWAY_ENV",
  "PAYWAY_MERCHANT_ID",
  "PAYWAY_API_KEY",
  "PAYWAY_MERCHANT_NAME",
  "BAKONG_TOKEN",
  "BAKONG_ACCOUNT_ID",
];

function fakeDb(order: Record<string, unknown>) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from() {
      let row: unknown = order;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
      chain["update"] = (values: Record<string, unknown>) => {
        updates.push(values);
        row = { id: order["id"] };
        return chain;
      };
      chain["maybeSingle"] = async () => ({ data: row });
      chain["then"] = (resolve: (v: unknown) => void) => resolve({ data: row });
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, updates };
}

const newOrder = {
  id: ORDER_ID,
  user_id: null,
  status: "pending",
  price_usd: "1.09",
  payment_qr: null,
  payment_md5: null,
  payment_expires_at: null,
  paid_at: null,
};

const withQr = (ref: string) => ({
  ...newOrder,
  payment_qr: "qr",
  payment_md5: ref,
  payment_expires_at: new Date(Date.now() + 600_000).toISOString(),
});

const approved = { status: "paid", amount: 1.09, currency: null, toAccountId: null, hash: "apv" };

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV_KEYS) delete process.env[k];
  process.env["BAKONG_TOKEN"] = "rbk_test";
  process.env["BAKONG_ACCOUNT_ID"] = "shop@aba";
  process.env["PAYWAY_MERCHANT_ID"] = "ec000002";
  process.env["PAYWAY_API_KEY"] = "key";
  createPaymentQr.mockResolvedValue({ qr: "bk-qr", md5: "bk-md5", expiresAt: Date.now() + 1e6 });
  createPaywayQr.mockResolvedValue({ qr: "pw-qr", tranId: "T1", expiresAt: Date.now() + 1e6 });
  deliverPaidOrder.mockResolvedValue({ ok: true, message: "", status: "processing" });
});

describe("choosing the provider", () => {
  it("keeps Bakong (the live path) unless PAYMENT_PROVIDER is payway", () => {
    expect(activeProvider()?.name).toBe("bakong");
    process.env["PAYMENT_PROVIDER"] = "PayWay";
    expect(activeProvider()?.name).toBe("bakong");
    process.env["PAYMENT_PROVIDER"] = "payway";
    expect(activeProvider()?.name).toBe("payway");
  });

  it("is PayWay Sandbox unless PAYWAY_ENV is exactly production", () => {
    process.env["PAYMENT_PROVIDER"] = "payway";
    expect(activeProvider()?.sandbox).toBe(true);
    process.env["PAYWAY_ENV"] = "prod";
    expect(activeProvider()?.sandbox).toBe(true);
    process.env["PAYWAY_ENV"] = "production";
    expect(activeProvider()?.sandbox).toBe(false);
  });

  it("is off when PayWay is chosen but its keys are missing", () => {
    process.env["PAYMENT_PROVIDER"] = "payway";
    delete process.env["PAYWAY_API_KEY"];
    expect(activeProvider()).toBeNull();
  });

  it("checks a stored QR with the provider that made it", () => {
    expect(providerForRef("payway:T1")?.name).toBe("payway");
    expect(providerForRef("c4403968073bb968bb26b3ca3dfb3115")?.name).toBe("bakong");
  });
});

describe("PayWay orders", () => {
  beforeEach(() => {
    process.env["PAYMENT_PROVIDER"] = "payway";
  });

  it("makes a PayWay KHQR for the order and stores its tran_id", async () => {
    const { db, updates } = fakeDb(newOrder);
    const state = await startOrderPayment(db, ORDER_ID, "guest");
    expect(createPaywayQr).toHaveBeenCalledWith(expect.anything(), {
      orderId: ORDER_ID,
      amount: 1.09,
    });
    expect(createPaymentQr).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({
      payment_qr: "pw-qr",
      payment_md5: "payway:T1",
      payment: "ABA PayWay",
    });
    expect(state).toMatchObject({
      qr: "pw-qr",
      provider: "ABA PayWay",
      merchant: "YURIC SHOP",
      sandbox: true,
    });
  });

  it("in Sandbox, confirms the payment but never marks the order paid or delivers", async () => {
    checkPaywayTransaction.mockResolvedValue(approved);
    const { db, updates } = fakeDb(withQr("payway:T1"));
    const state = await checkOrderPayment(db, ORDER_ID, null);
    expect(checkPaywayTransaction).toHaveBeenCalledWith(expect.anything(), "T1");
    expect(state).toMatchObject({ paid: true, sandbox: true, status: "sandbox" });
    expect(updates).toEqual([]);
    expect(deliverPaidOrder).not.toHaveBeenCalled();
  });

  it("in Production, marks a matching payment paid and starts the top-up", async () => {
    process.env["PAYWAY_ENV"] = "production";
    checkPaywayTransaction.mockResolvedValue(approved);
    const { db, updates } = fakeDb(withQr("payway:T1"));
    const state = await checkOrderPayment(db, ORDER_ID, null);
    expect(updates[0]).toMatchObject({ payment_hash: "apv" });
    expect(updates[0]).toHaveProperty("paid_at");
    expect(deliverPaidOrder).toHaveBeenCalledWith(db, ORDER_ID);
    expect(state).toMatchObject({ paid: true, status: "processing" });
  });

  it("does not deliver when the paid amount is not the order's price", async () => {
    process.env["PAYWAY_ENV"] = "production";
    checkPaywayTransaction.mockResolvedValue({ ...approved, amount: 0.5 });
    const { db, updates } = fakeDb(withQr("payway:T1"));
    const state = await checkOrderPayment(db, ORDER_ID, null);
    expect(state.paid).toBe(false);
    expect(updates).toEqual([]);
    expect(deliverPaidOrder).not.toHaveBeenCalled();
  });

  it("does nothing while PayWay says it is not paid", async () => {
    checkPaywayTransaction.mockResolvedValue({ status: "unpaid" });
    const { db, updates } = fakeDb(withQr("payway:T1"));
    expect((await checkOrderPayment(db, ORDER_ID, null)).paid).toBe(false);
    expect(updates).toEqual([]);
  });

  it("still checks a Bakong QR made before the switch with Bakong", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    const { db } = fakeDb(withQr("bk-md5"));
    await checkOrderPayment(db, ORDER_ID, null);
    expect(checkBakongPayment).toHaveBeenCalledWith(expect.anything(), "bk-md5");
    expect(checkPaywayTransaction).not.toHaveBeenCalled();
  });

  it("replaces a still-valid Bakong QR with a PayWay one after the switch", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    const { db, updates } = fakeDb(withQr("bk-md5"));
    const state = await startOrderPayment(db, ORDER_ID, "guest");
    expect(checkBakongPayment).toHaveBeenCalled();
    expect(state.qr).toBe("pw-qr");
    expect(updates[0]).toMatchObject({ payment_md5: "payway:T1" });
  });
});

describe("Bakong orders (live path)", () => {
  it("still makes a Bakong KHQR by default", async () => {
    const { db, updates } = fakeDb(newOrder);
    const state = await startOrderPayment(db, ORDER_ID, "guest");
    expect(createPaymentQr).toHaveBeenCalledWith(expect.anything(), {
      amount: 1.09,
      billNumber: "3C82A19D",
    });
    expect(createPaywayQr).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ payment_md5: "bk-md5", payment: "Bakong" });
    expect(state).toMatchObject({ qr: "bk-qr", provider: "Bakong" });
    expect(state.sandbox).toBeUndefined();
  });
});
