import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const checkBakongPayment = vi.fn();
const createPaymentQr = vi.fn();
const deliverPaidOrder = vi.fn();

vi.mock("@/lib/bakong", () => ({
  checkBakongPayment: (...a: unknown[]) => checkBakongPayment(...a),
  createPaymentQr: (...a: unknown[]) => createPaymentQr(...a),
  isRelayToken: () => true,
  paymentMatches: () => true,
}));
vi.mock("@/lib/delivery.server", () => ({
  deliverPaidOrder: (...a: unknown[]) => deliverPaidOrder(...a),
}));

const { startOrderPayment } = await import("@/lib/payment.server");

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

function fakeDb(salesOpen = true) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from(table: string) {
      let row: unknown =
        table === "store_settings" ? { sales_open: salesOpen, hidden_games: [] } : expiredOrder;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
      chain["update"] = (values: Record<string, unknown>) => {
        updates.push(values);
        row = { id: expiredOrder.id };
        return chain;
      };
      chain["maybeSingle"] = async () => ({ data: row });
      chain["then"] = (resolve: (v: unknown) => void) => resolve({ data: row });
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, updates };
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
    expect(updates[0]).toMatchObject({ payment_md5: "new-md5" });
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
