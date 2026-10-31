import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const checkBakongPayment = vi.fn();
const createPaymentQr = vi.fn();
const createPaymentLink = vi.fn();
const deliverPaidOrder = vi.fn();

vi.mock("@/lib/bakong", () => ({
  checkBakongPayment: (...a: unknown[]) => checkBakongPayment(...a),
  createPaymentLink: (...a: unknown[]) => createPaymentLink(...a),
  createPaymentQr: (...a: unknown[]) => createPaymentQr(...a),
  isRelayToken: () => true,
  paymentMatches: () => true,
}));
vi.mock("@/lib/delivery.server", () => ({
  deliverPaidOrder: (...a: unknown[]) => deliverPaidOrder(...a),
}));

const { checkEarlierQr, startOrderPayment } = await import("@/lib/payment.server");

const expiredOrder = {
  id: "0b8c1d2e-0000-4000-8000-000000000001",
  user_id: null,
  game_id: "mlbb",
  status: "pending",
  price_usd: "1.25",
  payment_qr: "old-qr",
  payment_md5: "old-md5",
  payment_expires_at: new Date(Date.now() - 60_000).toISOString(),
  paid_at: null,
};

function fakeDb(salesOpen = true, order: Record<string, unknown> = expiredOrder) {
  const updates: Record<string, unknown>[] = [];
  const inserts: { table: string; values: Record<string, unknown> }[] = [];
  const db = {
    from(table: string) {
      let row: unknown =
        table === "store_settings" ? { sales_open: salesOpen, hidden_games: [] } : order;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
      chain["insert"] = (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        row = null;
        return chain;
      };
      chain["update"] = (values: Record<string, unknown>) => {
        if (table === "order_payments") {
          updates.push({ table, ...values });
          return chain;
        }
        updates.push(values);
        row = { id: expiredOrder.id };
        return chain;
      };
      chain["maybeSingle"] = async () => ({ data: row });
      chain["then"] = (resolve: (v: unknown) => void) => resolve({ data: row });
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, updates, inserts };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["BAKONG_TOKEN"] = "rbk_test";
  process.env["BAKONG_ACCOUNT_ID"] = "shop@aba";
  createPaymentQr.mockResolvedValue({
    qr: "new-qr",
    md5: "new-md5",
    expiresAt: Date.now() + 600_000,
  });
  createPaymentLink.mockResolvedValue(null);
  deliverPaidOrder.mockResolvedValue({ ok: true, message: "", status: "processing" });
});

describe("expired KHQR", () => {
  it("asks Bakong about the old QR before replacing it, and delivers when it was paid", async () => {
    checkBakongPayment.mockResolvedValue({ status: "paid", hash: "h", amount: 1.25 });
    const { db, updates } = fakeDb();
    const state = await startOrderPayment(db, expiredOrder.id, "guest");
    expect(checkBakongPayment).toHaveBeenCalledWith(expect.anything(), "old-md5");
    expect(state.paid).toBe(true);
    expect(createPaymentQr).not.toHaveBeenCalled();
    expect(updates[0]).toHaveProperty("paid_at");
    expect(deliverPaidOrder).toHaveBeenCalledWith(db, expiredOrder.id);
  });

  it("makes a new QR when the old one was not paid", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    const { db, updates } = fakeDb();
    const state = await startOrderPayment(db, expiredOrder.id, "guest");
    expect(state).toMatchObject({ paid: false, qr: "new-qr" });
    expect(state.appLink).toBeUndefined();
    expect(updates[0]).toMatchObject({ payment_md5: "new-md5" });
  });

  it("adds the bank app link for the new QR when KHQR.dev gives one", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    createPaymentLink.mockResolvedValue("abamobilebank://pay?x=1");
    const { db } = fakeDb();
    const state = await startOrderPayment(db, expiredOrder.id, "guest");
    expect(createPaymentLink).toHaveBeenCalledWith(expect.anything(), "new-qr");
    expect(state.appLink).toBe("abamobilebank://pay?x=1");
  });

  it("remembers every new QR, so a payment with an older one is still found", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    const { db, inserts } = fakeDb();
    await startOrderPayment(db, expiredOrder.id, "guest");
    expect(inserts).toEqual([
      {
        table: "order_payments",
        values: expect.objectContaining({ md5: "new-md5", order_id: expiredOrder.id }),
      },
    ]);
  });

  it("shows a try-again message (no crash) when KHQR.dev can't make the QR", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    createPaymentQr.mockRejectedValue(new Error("KHQR.dev could not create the QR (HTTP 500)"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, updates } = fakeDb();
    const state = await startOrderPayment(db, expiredOrder.id, "guest");
    expect(state).toMatchObject({ available: true, paid: false });
    expect(state.message).toMatch(/try again|reload/i);
    expect(state.qr).toBeUndefined();
    expect(updates).toHaveLength(0);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("makes no new QR while the owner has sales switched off", async () => {
    checkBakongPayment.mockResolvedValue({ status: "unpaid" });
    const { db, updates } = fakeDb(false);
    const state = await startOrderPayment(db, expiredOrder.id, "guest");
    expect(state).toMatchObject({ paid: false });
    expect(state.qr).toBeUndefined();
    expect(createPaymentQr).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });
});

describe("earlier QRs (cron)", () => {
  it("marks the order paid when an earlier QR was paid", async () => {
    checkBakongPayment.mockResolvedValue({ status: "paid", hash: "h2", amount: 1.25 });
    const { db, updates } = fakeDb(true, { ...expiredOrder, payment_md5: "newest-md5" });
    const state = await checkEarlierQr(db, expiredOrder.id, "first-md5");
    expect(checkBakongPayment).toHaveBeenCalledWith(expect.anything(), "first-md5");
    expect(state.paid).toBe(true);
    expect(updates[0]).toMatchObject({ payment_hash: "h2" });
    expect(updates[1]).toMatchObject({ table: "order_payments" });
    expect(deliverPaidOrder).toHaveBeenCalledWith(db, expiredOrder.id);
  });

  it("leaves orders that are paid or not waiting for payment alone", async () => {
    const paid = fakeDb(true, { ...expiredOrder, paid_at: new Date().toISOString() });
    expect((await checkEarlierQr(paid.db, expiredOrder.id, "first-md5")).paid).toBe(true);
    const failed = fakeDb(true, { ...expiredOrder, status: "failed" });
    expect((await checkEarlierQr(failed.db, expiredOrder.id, "first-md5")).paid).toBe(false);
    expect(checkBakongPayment).not.toHaveBeenCalled();
  });
});
