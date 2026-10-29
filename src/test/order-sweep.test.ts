import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const deliverPaidOrder = vi.fn();
const refreshPaidOrder = vi.fn();
const supplierStock = vi.fn();
const checkOrderPayment = vi.fn();
const checkEarlierQr = vi.fn();

vi.mock("@/lib/delivery.server", () => ({
  adminDb: () => {
    throw new Error("tests pass their own db");
  },
  deliverPaidOrder: (...a: unknown[]) => deliverPaidOrder(...a),
  refreshPaidOrder: (...a: unknown[]) => refreshPaidOrder(...a),
  supplierStock: () => supplierStock(),
  UNKNOWN: "UNKNOWN",
}));
vi.mock("@/lib/payment.server", () => ({
  checkOrderPayment: (...a: unknown[]) => checkOrderPayment(...a),
  checkEarlierQr: (...a: unknown[]) => checkEarlierQr(...a),
  EARLIER_QR_WINDOW_MS: 86_400_000,
}));

const { sweepOrders } = await import("@/lib/order-sweep.server");

// Each read answers with the next list: unpaid KHQRs, paid-not-bought, processing.
// The stuck-PLACING update answers with `stuck`.
function fakeDb(lists: unknown[][], stuck: unknown[] = []) {
  let call = 0;
  return {
    from() {
      let isUpdate = false;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "is", "not", "gt", "lt", "order", "limit"]) {
        chain[m] = () => chain;
      }
      chain["update"] = () => {
        isUpdate = true;
        return chain;
      };
      chain["then"] = (resolve: (v: unknown) => void) =>
        resolve({ data: isUpdate ? stuck : (lists[call++] ?? []) });
      return chain;
    },
  } as unknown as SupabaseClient;
}

const paid = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  game_id: "mlbb",
  package_amt: "86 Diamonds",
  price_usd: "1.25",
  supplier_status: "INSUFFICIENT_BALANCE",
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  deliverPaidOrder.mockResolvedValue({ ok: true, message: "" });
  checkOrderPayment.mockResolvedValue({ available: true, paid: false });
  checkEarlierQr.mockResolvedValue({ available: true, paid: false });
});

describe("order sweep", () => {
  it("asks Bakong about each unpaid KHQR as the owner", async () => {
    checkOrderPayment.mockResolvedValueOnce({ available: true, paid: true });
    const report = await sweepOrders(fakeDb([[{ id: "a" }, { id: "b" }], [], []]));
    expect(checkOrderPayment).toHaveBeenCalledWith(expect.anything(), "a", null);
    expect(report).toMatchObject({ checked: 2, paid: 1 });
  });

  it("buys orders refused for low balance once FazerCards has money", async () => {
    supplierStock.mockResolvedValue({ ok: true, balance: 5 });
    const report = await sweepOrders(fakeDb([[], [paid("x"), paid("y")], []]));
    expect(deliverPaidOrder.mock.calls.map((c) => c[1])).toEqual(["x", "y"]);
    expect(report.retried).toBe(2);
  });

  it("does nothing while the balance is empty", async () => {
    supplierStock.mockResolvedValue({ ok: true, balance: 0 });
    await sweepOrders(fakeDb([[], [paid("x")], []]));
    expect(deliverPaidOrder).not.toHaveBeenCalled();
  });

  it("stops when the balance runs out", async () => {
    supplierStock.mockResolvedValue({ ok: true, balance: 1.3 });
    await sweepOrders(fakeDb([[], [paid("x"), paid("y")], []]));
    expect(deliverPaidOrder.mock.calls.map((c) => c[1])).toEqual(["x"]);
  });

  it("never retries an order that may already be placed, or a hand-delivered package", async () => {
    supplierStock.mockResolvedValue({ ok: true, balance: 50 });
    await sweepOrders(
      fakeDb([
        [],
        [
          paid("unconfirmed", { supplier_status: "UNCONFIRMED" }),
          paid("unknown", { supplier_status: "UNKNOWN" }),
          paid("placing", { supplier_status: "PLACING" }),
          paid("roblox", {
            game_id: "roblox",
            package_amt: "80 Robux",
            supplier_status: "NO_OFFER",
          }),
          paid("costly", { supplier_status: "COST_ABOVE_PRICE" }),
          paid("old-no-offer", { supplier_status: "NO_OFFER" }),
        ],
        [],
      ]),
    );
    expect(deliverPaidOrder.mock.calls.map((c) => c[1])).toEqual(["old-no-offer"]);
  });

  it("marks orders cut off while PLACING as UNKNOWN, without buying them", async () => {
    supplierStock.mockResolvedValue({ ok: true, balance: 50 });
    const report = await sweepOrders(fakeDb([[], [], []], [{ id: "cut" }]));
    expect(report.flagged).toBe(1);
    expect(deliverPaidOrder).not.toHaveBeenCalled();
  });

  it("checks FazerCards orders still processing", async () => {
    const report = await sweepOrders(fakeDb([[], [], [{ id: "p" }]]));
    expect(refreshPaidOrder).toHaveBeenCalledWith(expect.anything(), "p");
    expect(report.refreshed).toBe(1);
  });

  it("keeps going when one step fails", async () => {
    checkOrderPayment.mockRejectedValueOnce(new Error("Bakong down"));
    const report = await sweepOrders(fakeDb([[{ id: "a" }], [], [{ id: "p" }]]));
    expect(report.refreshed).toBe(1);
  });
});

describe("earlier QRs", () => {
  it("asks Bakong about expired QRs, each at most every 10 minutes", async () => {
    const errors = console.error;
    console.error = () => {}; // no database in tests: the limit falls back to memory
    try {
      checkEarlierQr.mockResolvedValueOnce({ available: true, paid: true });
      const old = [
        { md5: `m1-${Math.random()}`, order_id: "o1" },
        { md5: `m2-${Math.random()}`, order_id: "o2" },
      ];
      const first = await sweepOrders(fakeDb([[], [], [], old]));
      expect(checkEarlierQr.mock.calls.map((c) => [c[1], c[2]])).toEqual(
        old.map((o) => [o.order_id, o.md5]),
      );
      expect(first).toMatchObject({ checked: 2, paid: 1 });
      checkEarlierQr.mockClear();
      await sweepOrders(fakeDb([[], [], [], old]));
      expect(checkEarlierQr).not.toHaveBeenCalled();
    } finally {
      console.error = errors;
    }
  });
});
