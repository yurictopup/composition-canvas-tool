import { describe, expect, it } from "vitest";
import { gamePackages, getPackages } from "@/lib/games";

describe("Per-game packages", () => {
  it("MLBB lists real diamond denominations", () => {
    expect(getPackages("mlbb").map((p) => p.amt)).toEqual([
      "86", "172", "257", "344", "514", "706", "1412", "2195", "3688",
    ]);
  });

  it("Free Fire lists real diamond denominations", () => {
    expect(getPackages("ff").map((p) => p.amt)).toEqual([
      "50", "115", "240", "355", "480", "505", "610", "850", "1080", "1240", "2530",
    ]);
  });

  it("PUBG lists real UC denominations", () => {
    expect(getPackages("pubg").map((p) => p.amt)).toEqual([
      "60", "120", "180", "325", "660", "720", "985", "1800", "3850", "8100",
    ]);
  });

  it("Honor of Kings lists real token denominations", () => {
    expect(getPackages("hok").map((p) => p.amt)).toEqual([
      "16", "80", "240", "400", "560", "800", "1600", "2400", "4000", "8000",
    ]);
  });

  it("Genshin and Star Rail list bonus-inclusive denominations", () => {
    for (const id of ["genshin", "starrail"]) {
      expect(getPackages(id).map((p) => p.amt)).toEqual([
        "60", "300 + 30", "980 + 110", "1980 + 260", "3280 + 600", "6480 + 1600",
      ]);
    }
  });

  it("fallback prices are positive or unset (live prices come from Supabase)", () => {
    for (const list of Object.values(gamePackages)) {
      for (const p of list) {
        if (p.price !== null) expect(p.price).toBeGreaterThan(0);
      }
    }
  });

  it("Roblox has no direct top-up packages", () => {
    expect(getPackages("roblox")).toEqual([]);
  });

  it("unknown games get no packages rather than inherited ones", () => {
    expect(getPackages("not-a-game")).toEqual([]);
  });
});
