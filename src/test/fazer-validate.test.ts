import { beforeEach, describe, expect, it, vi } from "vitest";
import { pickValidateGame, resetValidateListCache, validateFazerPlayer } from "@/lib/fazercards";

const list = {
  ok: true,
  kind: "topups",
  items: [
    {
      category_id: "mobile_legends",
      name: "Mobile Legends: Bang Bang",
      fields: [
        { key: "player_id", label: "User ID", type: "text" },
        { key: "zone_id", label: "Zone ID", type: "text" },
      ],
    },
    {
      category_id: "free_fire",
      name: "Free Fire",
      fields: [{ key: "player_id", label: "Player ID", type: "text" }],
    },
    {
      category_id: "pubg_mobile",
      name: "PUBG Mobile",
      fields: [{ key: "player_id", label: "Player ID", type: "text" }],
    },
    { category_id: "lol_wild_rift", name: "League of Legends: Wild Rift", fields: [] },
  ],
};

function fakeFetch(answer: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = init?.method === "POST" ? answer : list;
    return new Response(JSON.stringify(body), {
      status: init?.method === "POST" ? status : 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function postBody(f: ReturnType<typeof vi.fn>) {
  const call = f.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST")!;
  return JSON.parse((call[1] as RequestInit).body as string);
}

beforeEach(() => resetValidateListCache());

describe("FazerCards game matching", () => {
  it("matches our games to FazerCards checks by name", () => {
    expect(pickValidateGame(list.items, "mlbb", "Mobile Legends")?.category_id).toBe(
      "mobile_legends",
    );
    expect(pickValidateGame(list.items, "ff", "Free Fire")?.category_id).toBe("free_fire");
    expect(pickValidateGame(list.items, "pubg", "PUBG Mobile")?.category_id).toBe("pubg_mobile");
  });

  it("never gives League of Legends the Wild Rift check", () => {
    expect(pickValidateGame(list.items, "lol", "League of Legends")).toBeNull();
    expect(
      pickValidateGame(list.items, "wildrift", "League of Legends: Wild Rift")?.category_id,
    ).toBe("lol_wild_rift");
  });

  it("returns null for a game FazerCards can't check", () => {
    expect(pickValidateGame(list.items, "hok", "Honor of Kings")).toBeNull();
  });
});

describe("FazerCards player name check", () => {
  it("returns the in-game name and sends the zone", async () => {
    const f = fakeFetch({ ok: true, valid: true, player_name: " KENZO " });
    const result = await validateFazerPlayer(
      { gameId: "mlbb", primary: "730523826", secondary: "10364" },
      { apiKey: "k", fetchImpl: f, gameName: "Mobile Legends" },
    );
    expect(result).toEqual({ status: "found", name: "KENZO" });
    expect(postBody(f)).toEqual({
      category_id: "mobile_legends",
      fields: { player_id: "730523826", zone_id: "10364" },
    });
  });

  it("reports a wrong ID as not found", async () => {
    const f = fakeFetch({ ok: true, valid: false });
    const result = await validateFazerPlayer(
      { gameId: "ff", primary: "1" },
      { apiKey: "k", fetchImpl: f, gameName: "Free Fire" },
    );
    expect(result).toEqual({ status: "not_found" });
  });

  it("is unsupported for games FazerCards can't check, without a POST", async () => {
    const f = fakeFetch({});
    const result = await validateFazerPlayer(
      { gameId: "hok", primary: "1" },
      { apiKey: "k", fetchImpl: f, gameName: "Honor of Kings" },
    );
    expect(result).toEqual({ status: "unsupported" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("is unavailable when FazerCards errors", async () => {
    const f = fakeFetch({ ok: false, error: "down" }, 500);
    const result = await validateFazerPlayer(
      { gameId: "pubg", primary: "5" },
      { apiKey: "k", fetchImpl: f, gameName: "PUBG Mobile" },
    );
    expect(result).toEqual({ status: "unavailable" });
  });
});
