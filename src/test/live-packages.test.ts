import { describe, expect, it } from "vitest";
import { livePackages, packageSize } from "@/lib/prices";

describe("packageSize", () => {
  it("adds bonus amounts", () => {
    expect(packageSize("78 + 8")).toBe(86);
    expect(packageSize("100 Diamonds")).toBe(100);
  });
});

describe("livePackages", () => {
  const builtIn = [
    { amt: "100", price: 0.99 },
    { amt: "310", price: 2.99 },
  ];
  it("adds packages created in Admin and drops ones switched off", () => {
    const rows = [
      { game_id: "ff", package_amt: "100 Diamonds", price_usd: 1.05, active: true },
      { game_id: "ff", package_amt: "310 Diamonds", price_usd: 3.1, active: false },
      { game_id: "ff", package_amt: "200 Diamonds", price_usd: 2.1, active: true },
      { game_id: "mlbb", package_amt: "50 Diamonds", price_usd: 1, active: true },
    ];
    const prices = new Map(rows.map((r) => [`${r.game_id}|${r.package_amt}`, r]));
    const out = livePackages(prices as never, "ff", "Diamonds", builtIn, []);
    expect(out.map((p) => [p.amt, p.price])).toEqual([
      ["100", 1.05],
      ["200", 2.1],
    ]);
  });
});
