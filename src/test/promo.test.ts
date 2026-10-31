import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePromo } from "@/lib/promo";
import { quotePromo } from "@/lib/promo.server";

function rpcDb(result: { data?: unknown; error?: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { db: { rpc } as unknown as SupabaseClient, rpc };
}

describe("promo code format", () => {
  it("upper-cases and trims a valid code", () => {
    expect(normalizePromo("  yuric10 ")).toBe("YURIC10");
  });

  it("refuses codes with spaces, symbols or the wrong length", () => {
    for (const bad of ["", "AB", "YURIC 10", "YURIC-10", "A".repeat(21), null, undefined]) {
      expect(normalizePromo(bad)).toBeNull();
    }
  });
});

describe("promo quote", () => {
  it("returns the database's discounted price", async () => {
    const { db, rpc } = rpcDb({ data: [{ price_usd: "1.10", discount_usd: "0.12", percent_off: 10 }] });
    expect(await quotePromo(db, "mlbb", "86 Diamonds", " yuric10 ")).toEqual({
      ok: true,
      code: "YURIC10",
      price: 1.1,
      discount: 0.12,
      percent: 10,
    });
    expect(rpc).toHaveBeenCalledWith("promo_quote", {
      p_game_id: "mlbb",
      p_package_amt: "86 Diamonds",
      p_code: "YURIC10",
    });
  });

  it("passes on the database's reason for refusing a code", async () => {
    const { db } = rpcDb({ error: { message: "This promo code has expired." } });
    expect(await quotePromo(db, "mlbb", "86 Diamonds", "OLD10")).toEqual({
      ok: false,
      message: "This promo code has expired.",
    });
  });

  it("never shows raw database errors to the customer", async () => {
    const { db } = rpcDb({ error: { message: 'relation "x" does not exist' } });
    expect(await quotePromo(db, "mlbb", "86 Diamonds", "YURIC10")).toEqual({
      ok: false,
      message: "This promo code is not valid.",
    });
  });

  it("does not ask the database about something that can't be a code", async () => {
    const { db, rpc } = rpcDb({});
    expect((await quotePromo(db, "mlbb", "86 Diamonds", "no way!")).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
