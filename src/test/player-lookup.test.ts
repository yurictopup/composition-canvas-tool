import { describe, expect, it, vi } from "vitest";
import { cachedLookup, lookupWithGamesDrop, parseOfferIds } from "@/lib/player-lookup";

function fakeFetch(routes: Record<string, unknown>, status = 200) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (!(path in routes)) throw new Error(`unexpected ${path}`);
    return new Response(JSON.stringify(routes[path]), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const check = "/api/v1/offers/check-game-data";
const servers = "/api/v1/partner/product-offer/servers";
const base = {
  token: "tok",
  offerIds: { mlbb: 1001, genshin: 2002, wildrift: 3003 },
  usesServerPicker: false,
};

function sentBody(f: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse((f.mock.calls[call]![1] as RequestInit).body as string);
}

describe("GamesDrop offer configuration", () => {
  it("keeps only positive integer offer ids", () => {
    expect(parseOfferIds('{"mlbb":1001,"ff":"2","pubg":-1,"hok":1.5}')).toEqual({ mlbb: 1001 });
    expect(parseOfferIds("not json")).toEqual({});
    expect(parseOfferIds(undefined)).toEqual({});
  });
});

describe("GamesDrop player lookup", () => {
  it("returns the in-game name for a valid MLBB ID and sends the zone as server", async () => {
    const f = fakeFetch({ [check]: { status: "VALID", gameUserLogin: "Yuric" } });
    const result = await lookupWithGamesDrop(
      { gameId: "mlbb", primary: " 12345678 ", secondary: "1234" },
      { ...base, fetchImpl: f },
    );
    expect(result).toEqual({ status: "found", name: "Yuric" });
    expect(sentBody(f)).toEqual({ offerId: 1001, gameUserId: "12345678", gameServerId: "1234" });
    expect((f.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: "tok" });
  });

  it("reports an unknown player as not found", async () => {
    const f = fakeFetch({ [check]: { status: "INVALID" } });
    expect(
      await lookupWithGamesDrop(
        { gameId: "mlbb", primary: "1", secondary: "2" },
        { ...base, fetchImpl: f },
      ),
    ).toEqual({ status: "not_found" });
  });

  it("treats supplier errors and odd answers as unavailable, never as verified", async () => {
    expect(
      await lookupWithGamesDrop(
        { gameId: "mlbb", primary: "1" },
        { ...base, fetchImpl: fakeFetch({ [check]: {} }, 503) },
      ),
    ).toEqual({ status: "unavailable" });
    expect(
      await lookupWithGamesDrop(
        { gameId: "mlbb", primary: "1" },
        { ...base, fetchImpl: fakeFetch({ [check]: { status: "VALID" } }) },
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("is unsupported without a token or an offer for the game", async () => {
    const f = fakeFetch({});
    expect(
      await lookupWithGamesDrop({ gameId: "ff", primary: "1" }, { ...base, fetchImpl: f }),
    ).toEqual({ status: "unsupported" });
    expect(
      await lookupWithGamesDrop(
        { gameId: "mlbb", primary: "1" },
        { ...base, token: undefined, fetchImpl: f },
      ),
    ).toEqual({ status: "unsupported" });
    expect(f).not.toHaveBeenCalled();
  });

  it("maps a picked server label to the supplier's server value", async () => {
    const f = fakeFetch({
      [servers]: { Asia: "os_asia", Europe: "os_euro" },
      [check]: { status: "VALID", gameUserLogin: "Traveler" },
    });
    const result = await lookupWithGamesDrop(
      { gameId: "genshin", primary: "812345678", secondary: "Asia" },
      { ...base, usesServerPicker: true, fetchImpl: f },
    );
    expect(result).toEqual({ status: "found", name: "Traveler" });
    expect(sentBody(f, 1)).toEqual({
      offerId: 2002,
      gameUserId: "812345678",
      gameServerId: "os_asia",
    });
  });

  it("is unavailable when the picked server is not offered", async () => {
    const f = fakeFetch({ [servers]: { Asia: "os_asia" } });
    expect(
      await lookupWithGamesDrop(
        { gameId: "genshin", primary: "8", secondary: "Europe" },
        { ...base, usesServerPicker: true, fetchImpl: f },
      ),
    ).toEqual({ status: "unavailable" });
  });

  it("joins Riot ID and tagline for Wild Rift", async () => {
    const f = fakeFetch({ [check]: { status: "VALID", gameUserLogin: "Yuric#SEA1" } });
    await lookupWithGamesDrop(
      { gameId: "wildrift", primary: "Yuric", secondary: "#SEA1" },
      { ...base, fetchImpl: f },
    );
    expect(sentBody(f)).toEqual({ offerId: 3003, gameUserId: "Yuric#SEA1" });
  });
});

describe("Lookup cache", () => {
  it("reuses definite answers but retries outages", async () => {
    const found = vi.fn(async () => ({ status: "found" as const, name: "A" }));
    await cachedLookup({ gameId: "mlbb", primary: "cache-1", secondary: "1" }, found);
    await cachedLookup({ gameId: "mlbb", primary: "cache-1", secondary: "1" }, found);
    expect(found).toHaveBeenCalledTimes(1);

    const down = vi.fn(async () => ({ status: "unavailable" as const }));
    await cachedLookup({ gameId: "mlbb", primary: "cache-2" }, down);
    await cachedLookup({ gameId: "mlbb", primary: "cache-2" }, down);
    expect(down).toHaveBeenCalledTimes(2);
  });
});
