import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { livePrice, packageKey, type PriceMap } from "@/lib/prices";

const row = (package_amt: string, price_usd: number, active = true) => ({
  game_id: "ff",
  package_amt,
  game_name: "Free Fire",
  price_usd,
  active,
});

describe("livePrice", () => {
  const prices: PriceMap = new Map([
    ["ff|100 Diamonds", row("100 Diamonds", 0.95)],
    ["ff|310 Diamonds", row("310 Diamonds", 2.4, false)],
  ]);

  it("keys packages the way orders store them", () => {
    expect(packageKey("1080 + 108", "Diamonds")).toBe("1080 + 108 Diamonds");
  });

  it("shows the fallback price until live prices load", () => {
    expect(livePrice(null, "ff", "100 Diamonds", 0.99)).toBe(0.99);
  });

  it("uses the owner's price once loaded", () => {
    expect(livePrice(prices, "ff", "100 Diamonds", 0.99)).toBe(0.95);
  });

  it("takes packages that are switched off or not listed off sale", () => {
    expect(livePrice(prices, "ff", "310 Diamonds", 2.49)).toBeNull();
    expect(livePrice(prices, "ff", "520 Diamonds", 4.99)).toBeNull();
  });
});
