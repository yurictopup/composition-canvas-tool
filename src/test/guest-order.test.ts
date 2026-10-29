import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGuestOrder, guestToken, guestTokenValid } from "@/lib/guest-order.server";

const ORDER = "3c82a19d-0000-4000-8000-000000000001";
const OTHER = "3c82a19d-0000-4000-8000-000000000002";

describe("guest order links", () => {
  beforeEach(() => {
    process.env["ORDER_LINK_SECRET"] = "test-secret";
  });
  afterEach(() => {
    delete process.env["ORDER_LINK_SECRET"];
  });

  it("accepts the token made for the order", () => {
    const token = guestToken(ORDER);
    expect(token).toHaveLength(32);
    expect(guestTokenValid(ORDER, token)).toBe(true);
  });

  it("refuses another order's token and made-up tokens", () => {
    expect(guestTokenValid(OTHER, guestToken(ORDER))).toBe(false);
    expect(guestTokenValid(ORDER, "x".repeat(32))).toBe(false);
    expect(guestTokenValid(ORDER, "short")).toBe(false);
  });

  it("changes when the secret changes", () => {
    const before = guestToken(ORDER);
    process.env["ORDER_LINK_SECRET"] = "another-secret";
    expect(guestToken(ORDER)).not.toBe(before);
  });
});

/** Every orders count answers `openCount`; records the filters of each query. */
function fakeDb(openCount: number) {
  const filters: string[][] = [];
  const inserted: unknown[] = [];
  const db = {
    from(table: string) {
      const seen: string[] = [];
      filters.push(seen);
      const q = {
        select: () => q,
        eq: (col: string) => (seen.push(col), q),
        is: (col: string) => (seen.push(col), q),
        gt: (col: string) => (seen.push(col), q),
        insert: (row: unknown) => (inserted.push(row), q),
        maybeSingle: async () =>
          table === "store_settings"
            ? { data: { sales_open: true, hidden_games: [] }, error: null }
            : { data: { game_name: "Free Fire", price_usd: 1.09 }, error: null },
        single: async () => ({ data: { id: ORDER, price_usd: 1.09 }, error: null }),
        then: (done: (r: { count: number }) => unknown) => done({ count: openCount }),
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, filters, inserted };
}

describe("guest checkout", () => {
  beforeEach(() => {
    process.env["ORDER_LINK_SECRET"] = "test-secret";
  });
  afterEach(() => {
    delete process.env["ORDER_LINK_SECRET"];
  });

  it("lets a player order even when others left unpaid orders on their ID", async () => {
    const { db, filters, inserted } = fakeDb(5);
    const order = await createGuestOrder(db, {
      gameId: "ff",
      packageAmt: "100",
      playerId: "123456",
    });
    expect(order.orderId).toBe(ORDER);
    expect(inserted).toHaveLength(1);
    expect(filters.some((f) => f.includes("player_id"))).toBe(false);
  });

  it("still stops a flood of unpaid guest orders for the whole shop", async () => {
    const { db } = fakeDb(60);
    await expect(
      createGuestOrder(db, { gameId: "ff", packageAmt: "100", playerId: "123456" }),
    ).rejects.toThrow("The shop is very busy");
  });
});
