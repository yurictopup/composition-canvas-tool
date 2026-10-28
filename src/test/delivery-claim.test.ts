import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const placeFazerOrder = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/fazercards", () => ({
  placeFazerOrder: (...a: unknown[]) => placeFazerOrder(...a),
  checkFazerOrder: vi.fn(),
  fetchFazerAccount: vi.fn(),
}));

const { deliverPaidOrder, PLACING_STALE_MS } = await import("@/lib/delivery.server");

// The claim update answers with `claimed` (null = another call holds the order).
function fakeDb(claimed: unknown) {
  const ors: string[] = [];
  const db = {
    from() {
      const chain: Record<string, unknown> = {};
      for (const m of ["update", "eq", "in", "is", "not", "select"]) chain[m] = () => chain;
      chain["or"] = (filter: string) => {
        ors.push(filter);
        return chain;
      };
      chain["maybeSingle"] = async () => ({ data: claimed });
      chain["then"] = (resolve: (v: unknown) => void) => resolve({ data: null });
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, ors };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["FAZERCARDS_API_KEY"] = "test-key";
});

describe("deliverPaidOrder claim", () => {
  it("skips an order another call is still placing", async () => {
    const { db, ors } = fakeDb(null);
    const res = await deliverPaidOrder(db, "o1");
    expect(res.ok).toBe(false);
    expect(placeFazerOrder).not.toHaveBeenCalled();
    expect(ors[0]).toContain("supplier_status.neq.PLACING");
  });

  it("lets a PLACING order be tried again only once it is stale", async () => {
    const { db, ors } = fakeDb(null);
    const before = Date.now();
    await deliverPaidOrder(db, "o1");
    const stale = Date.parse(/updated_at\.lt\."([^"]+)"/.exec(ors[0]!)![1]!);
    expect(before - stale).toBeGreaterThanOrEqual(PLACING_STALE_MS - 1000);
    expect(before - stale).toBeLessThanOrEqual(PLACING_STALE_MS + 1000);
  });

  it("buys a claimed order", async () => {
    placeFazerOrder.mockResolvedValue({ status: "processing", supplierStatus: "PROCESSING" });
    const { db } = fakeDb({
      id: "o1",
      game_id: "mlbb",
      package_amt: "86 Diamonds",
      player_id: "1",
      player_zone: "1",
      paid_at: "2026-10-28T00:00:00Z",
      price_usd: 1.5,
    });
    const res = await deliverPaidOrder(db, "o1");
    expect(placeFazerOrder).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });
});
