import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const refreshPaidOrder = vi.fn();

vi.mock("@/lib/bakong", () => ({
  checkBakongPayment: vi.fn(),
  createPaymentLink: vi.fn(),
  createPaymentQr: vi.fn(),
  isRelayToken: () => true,
  paymentMatches: () => true,
}));
vi.mock("@/lib/delivery.server", () => ({
  deliverPaidOrder: vi.fn(),
  refreshPaidOrder: (...a: unknown[]) => refreshPaidOrder(...a),
}));

const { checkOrderPayment } = await import("@/lib/payment.server");

const order = {
  id: "0b8c1d2e-0000-4000-8000-000000000002",
  user_id: null,
  game_id: "ff",
  status: "processing",
  price_usd: "0.29",
  payment_qr: "qr",
  payment_md5: "md5",
  payment_expires_at: null,
  paid_at: "2026-11-01T09:32:56Z",
  delivery_codes: null,
};

/** A database whose order row changes when the supplier refresh runs. */
function fakeDb(row: { current: Record<string, unknown> }) {
  return {
    from() {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
      chain["maybeSingle"] = async () => ({ data: row.current });
      return chain;
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["BAKONG_TOKEN"] = "rbk_test";
  process.env["BAKONG_ACCOUNT_ID"] = "shop@aba";
});

describe("a paid order that is being delivered", () => {
  it("asks the supplier at once and returns the finished status", async () => {
    const row = { current: { ...order } };
    refreshPaidOrder.mockImplementation(async () => {
      row.current = { ...order, status: "completed" };
    });
    const state = await checkOrderPayment(fakeDb(row), order.id, "guest", {
      beforeSupplierCheck: async () => true,
    });
    expect(refreshPaidOrder).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({ paid: true, status: "completed" });
  });

  it("does not ask the supplier again while the last question was a moment ago", async () => {
    const state = await checkOrderPayment(fakeDb({ current: { ...order } }), order.id, "guest", {
      beforeSupplierCheck: async () => false,
    });
    expect(refreshPaidOrder).not.toHaveBeenCalled();
    expect(state).toMatchObject({ paid: true, status: "processing" });
  });

  it("keeps showing processing when the supplier cannot be reached", async () => {
    refreshPaidOrder.mockRejectedValue(new Error("FazerCards timeout"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await checkOrderPayment(fakeDb({ current: { ...order } }), order.id, "guest", {
      beforeSupplierCheck: async () => true,
    });
    expect(state).toMatchObject({ paid: true, status: "processing" });
    errors.mockRestore();
  });

  it("leaves a completed order alone", async () => {
    const done = { ...order, status: "completed" };
    const state = await checkOrderPayment(fakeDb({ current: done }), order.id, "guest", {
      beforeSupplierCheck: async () => true,
    });
    expect(refreshPaidOrder).not.toHaveBeenCalled();
    expect(state).toMatchObject({ paid: true, status: "completed" });
  });
});
