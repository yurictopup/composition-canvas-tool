import { describe, expect, it } from "vitest";
import { answer, priceLines } from "@/lib/chatBrain";
import { findGame } from "@/lib/games";
import type { PriceMap } from "@/lib/prices";

function priceMap(rows: [string, string, number, boolean?][]): PriceMap {
  return new Map(
    rows.map(([gameId, amt, price, active = true]) => [
      `${gameId}|${amt}`,
      { game_id: gameId, package_amt: amt, game_name: gameId, price_usd: price, active },
    ]),
  );
}

describe("Yuric Bot prices", () => {
  const prices = priceMap([
    ["mlbb", "86 Diamonds", 1.21],
    ["mlbb", "172 Diamonds", 2.41],
    ["mlbb", "11 Diamonds", 0.27],
    ["mlbb", "Weekly Pass Diamonds", 1.53],
    ["mlbb", "257 Diamonds", 3.6, false],
  ]);

  it("quotes today's prices, cheapest first, and leaves out switched-off packages", () => {
    const list = priceLines(findGame("mlbb")!, prices)!;
    expect(list.indexOf("11 Diamonds")).toBeLessThan(list.indexOf("172 Diamonds"));
    expect(list).toContain("86 Diamonds = $1.21");
    expect(list).toContain("Weekly Pass = $1.53");
    expect(list).not.toContain("257 Diamonds");
  });

  it("has no price list without live prices", () => {
    expect(priceLines(findGame("mlbb")!, null)).toBeNull();
    expect(priceLines(findGame("mlbb")!, priceMap([]))).toBeNull();
  });

  it("answers 'price of MLBB' with the live prices", () => {
    const reply = answer("តម្លៃ MLBB", undefined, prices);
    expect(reply.text).toContain("$1.21");
    expect(reply.actions?.[0]?.href).toBe("/game/mlbb");
  });

  it("still points to the game page when prices aren't loaded", () => {
    const reply = answer("តម្លៃ MLBB", undefined, null);
    expect(reply.text).not.toContain("$");
    expect(reply.actions?.[0]?.href).toBe("/game/mlbb");
  });
});

describe("Yuric Bot topics", () => {
  it("explains promo codes without inventing one", () => {
    const reply = answer("មានលេខកូដបញ្ចុះតម្លៃទេ?");
    expect(reply.text).toContain("លេខកូដបញ្ចុះតម្លៃ");
    expect(reply.text).not.toMatch(/\b[A-Z]{3,}[0-9]{2,}\b/);
  });

  it("knows Telegram Stars and Premium go to a username", () => {
    const reply = answer("telegram stars ទិញម៉េច");
    expect(reply.text).toContain("username");
    expect(reply.actions?.[0]?.href).toBe("/game/tgstars");
  });

  it("describes ABA KHQR payment, not the old Bakong card", () => {
    const reply = answer("បង់ប្រាក់តាមអ្វី");
    expect(reply.text).toContain("ABA KHQR");
  });
});
