import { describe, expect, it } from "vitest";
import { gamePackages, getPackages } from "@/lib/games";

describe("Per-game packages", () => {
  it("MLBB lists real diamond denominations", () => {
    expect(getPackages("mlbb").map((p) => p.amt)).toEqual([
      "5",
      "11 + 1",
      "22 + 2",
      "56 + 5",
      "112 + 10",
      "223 + 20",
      "336 + 33",
      "570 + 66",
      "1163 + 156",
      "2398 + 383",
      "6042 + 1007",
    ]);
  });

  it("Free Fire lists real diamond denominations", () => {
    expect(getPackages("ff").map((p) => p.amt)).toEqual([
      "100",
      "310",
      "520",
      "1080 + 108",
      "2200 + 220",
      "5600 + 560",
    ]);
  });

  it("PUBG lists real UC denominations", () => {
    expect(getPackages("pubg").map((p) => p.amt)).toEqual([
      "60",
      "325 + 25",
      "660 + 60",
      "1800 + 300",
      "3850",
      "8100",
    ]);
  });

  it("Honor of Kings lists real token denominations", () => {
    expect(getPackages("hok").map((p) => p.amt)).toEqual([
      "80",
      "240",
      "400",
      "800",
      "1200",
      "2400",
      "4000 + 180",
    ]);
  });

  it("Genshin and Star Rail list bonus-inclusive denominations", () => {
    for (const id of ["genshin", "starrail"]) {
      expect(getPackages(id).map((p) => p.amt)).toEqual([
        "60",
        "300 + 30",
        "980 + 110",
        "1980 + 260",
        "3280 + 600",
        "6480 + 1600",
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
