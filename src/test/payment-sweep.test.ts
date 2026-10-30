import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const checkBakongPayments = vi.fn();
const deliverPaidOrder = vi.fn();
const allowed = { gate: true, budget: true };

vi.mock("@/lib/bakong", () => ({
  checkBakongPayment: vi.fn(),
  checkBakongPayments: (...a: unknown[]) => checkBakongPayments(...a),
  createPaymentQr: vi.fn(),
  MD5_LIST_MAX: 50,
  paymentMatches: () => true,
}));
vi.mock("@/lib/delivery.server", () => ({
  deliverPaidOrder: (...a: unknown[]) => deliverPaidOrder(...a),
}));
vi.mock("@/lib/rate-limit.server", () => ({
  checkLimits: async () => ({ allowed: allowed.gate }),
  nbcBudgetAllowed: async () => allowed.budget,
}));

const { sweepBakongPayments } = await import("@/lib/payment.server");

const NOW = Date.parse("2026-10-30T08:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

const order = (id: string) => ({
  id,
  user_id: null,
  game_id: "mlbb",
  status: "pending",
  price_usd: "1.25",
  payment_qr: "qr",
  payment_md5: `${id}-md5`,
  payment_expires_at: minutesAgo(-20),
  paid_at: null,
});

// order_payments rows for the list check, then each order as it is loaded;
// updates (marking paid) answer with the order id.
function fakeDb(qrs: { md5: string; order_id: string; created_at: string }[]) {
  const marked: string[] = [];
  const db = {
    from(table: string) {
      let id = "";
      let isUpdate = false;
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "is", "gt", "order", "limit", "not"]) chain[m] = () => chain;
      chain["eq"] = (col: string, value: string) => {
        if (col === "id") id = value;
        return chain;
      };
      chain["update"] = () => {
        isUpdate = true;
        return chain;
      };
      const answer = () => {
        if (table === "order_payments") return { data: isUpdate ? null : qrs, error: null };
        if (isUpdate) {
          marked.push(id);
          return { data: { id }, error: null };
        }
        return { data: { ...order(id), status: "processing", delivery_codes: null }, error: null };
      };
      chain["maybeSingle"] = async () =>
        isUpdate || marked.includes(id) ? answer() : { data: order(id), error: null };
      chain["then"] = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(answer()).then(resolve, reject);
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, marked };
}

beforeEach(() => {
  vi.clearAllMocks();
  allowed.gate = true;
  allowed.budget = true;
  process.env["BAKONG_NBC_TOKEN"] = "eyJtest";
  process.env["BAKONG_NBC_ACCOUNT_ID"] = "shop@bkrt";
  deliverPaidOrder.mockResolvedValue({ ok: true, message: "", status: "processing" });
});

describe("cron Bakong list check", () => {
  it("asks about every unpaid QR in one request and delivers the paid one", async () => {
    checkBakongPayments.mockResolvedValue({
      status: "ok",
      paid: new Map([["o1-md5", { status: "paid", amount: 1.25, currency: "USD", toAccountId: "shop@bkrt", hash: "h1" }]]),
    });
    const { db, marked } = fakeDb([
      { md5: "o1-md5", order_id: "o1", created_at: minutesAgo(5) },
      { md5: "o2-md5", order_id: "o2", created_at: minutesAgo(10) },
    ]);
    const result = await sweepBakongPayments(db, NOW);
    expect(checkBakongPayments).toHaveBeenCalledTimes(1);
    expect(checkBakongPayments.mock.calls[0]![1]).toEqual(["o1-md5", "o2-md5"]);
    expect(marked).toContain("o1");
    expect(deliverPaidOrder).toHaveBeenCalledWith(db, "o1");
    expect(deliverPaidOrder).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ checked: 2, paid: 1 });
  });

  it("asks nothing when there is no unpaid QR", async () => {
    const result = await sweepBakongPayments(fakeDb([]).db, NOW);
    expect(checkBakongPayments).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 0, paid: 0 });
  });

  it("waits for the next window, and never spends past the daily budget", async () => {
    const qrs = [{ md5: "o1-md5", order_id: "o1", created_at: minutesAgo(5) }];
    allowed.gate = false;
    await sweepBakongPayments(fakeDb(qrs).db, NOW);
    allowed.gate = true;
    allowed.budget = false;
    await sweepBakongPayments(fakeDb(qrs).db, NOW);
    expect(checkBakongPayments).not.toHaveBeenCalled();
  });

  it("marks nothing when NBC refuses (e.g. the daily limit)", async () => {
    const errors = console.error;
    console.error = () => {};
    try {
      checkBakongPayments.mockResolvedValue({ status: "unavailable", message: "error 19" });
      const { db, marked } = fakeDb([{ md5: "o1-md5", order_id: "o1", created_at: minutesAgo(5) }]);
      expect(await sweepBakongPayments(db, NOW)).toEqual({ checked: 1, paid: 0 });
      expect(marked).toEqual([]);
      expect(deliverPaidOrder).not.toHaveBeenCalled();
    } finally {
      console.error = errors;
    }
  });
});
