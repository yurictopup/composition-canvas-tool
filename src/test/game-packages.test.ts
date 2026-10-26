import { describe, expect, it } from "vitest";
import { gamePackages, getPackages } from "@/lib/games";

describe("Per-game packages", () => {
  it("MLBB lists real diamond denominations", () => {
    expect(getPackages("mlbb").map((p) => p.amt)).toEqual([
      "86",
      "172",
      "257",
      "706",
      "2195",
      "3688",
      "5532",
      "9288",
    ]);
  });

  it("Free Fire lists real diamond denominations", () => {
    expect(getPackages("ff").map((p) => p.amt)).toEqual([
      "25",
      "100",
      "310",
      "520",
      "1060",
      "2180",
      "5600",
    ]);
  });

  it("PUBG lists real UC denominations", () => {
    expect(getPackages("pubg").map((p) => p.amt)).toEqual([
      "60",
      "300 + 25",
      "600 + 60",
      "1500 + 300",
      "3000 + 850",
      "6000 + 2100",
    ]);
  });

  it("Honor of Kings lists real token denominations", () => {
    expect(getPackages("hok").map((p) => p.amt)).toEqual([
      "16",
      "80",
      "240",
      "400",
      "560",
      "800",
      "1200",
      "2400",
      "4000",
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

  it("Roblox sells Robux packages by username", () => {
    expect(getPackages("roblox").map((p) => p.amt)).toEqual(["80", "500", "1000", "2000"]);
  });

  it("unknown games get no packages rather than inherited ones", () => {
    expect(getPackages("not-a-game")).toEqual([]);
  });
});
