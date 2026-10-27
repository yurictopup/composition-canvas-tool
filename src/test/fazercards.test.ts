import { describe, expect, it, vi } from "vitest";
import { findGame, gamePackages, hotItemsByGame } from "@/lib/games";
import { packageKey } from "@/lib/prices";
import { fazerCatalog } from "@/lib/fazercards-catalog";
import { buildFields, checkFazerOrder, mapFazerStatus, placeFazerOrder } from "@/lib/fazercards";

type Route = { status?: number; body: unknown };

function fakeFetch(routes: Record<string, Route | (() => never)>) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = new URL(String(url));
    const route = routes[u.pathname + u.search] ?? routes[u.pathname];
    if (!route) throw new Error(`unexpected ${u.pathname}${u.search}`);
    if (typeof route === "function") return route();
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const mlbbCategory = fazerCatalog["mlbb"]!.categoryId;
const mlbbOffers = `/api/v2/topups/offers?category_id=${mlbbCategory}`;
const create = "/api/v2/topups/order";
const order = {
  id: "0b8c1d2e-0000-4000-8000-000000000001",
  game_id: "mlbb",
  package_amt: "86 Diamonds",
  player_id: "12345678",
  player_zone: "1234",
};
const offersBody = {
  ok: true,
  offers: [
    { offer_id: "o-86", name: "78 + 8 Diamonds", price_usd: 1.2 },
    { offer_id: "o-172", name: "156 + 16 Diamonds", price_usd: 2.4 },
  ],
  fields: [
    { key: "player_id", label: "Player ID", type: "text" },
    { key: "server_id", label: "Server ID", type: "text" },
  ],
};

describe("FazerCards catalog", () => {
  it("only names packages the store sells", () => {
    for (const [gameId, game] of Object.entries(fazerCatalog)) {
      const unit = findGame(gameId)!.unit;
      const ours = new Set([
        ...(gamePackages[gameId] ?? []).map((p) => packageKey(p.amt, unit)),
        ...(hotItemsByGame[gameId] ?? []).map((h) => packageKey(h.label, unit)),
      ]);
      for (const key of Object.keys(game.offers)) expect(ours, `${gameId}: ${key}`).toContain(key);
    }
  });
});

describe("FazerCards fields", () => {
  it("fills ID and zone", () => {
    expect(buildFields(offersBody.fields, order)).toEqual({
      player_id: "12345678",
      server_id: "1234",
    });
  });
  it("joins Riot ID and tagline", () => {
    expect(buildFields([{ key: "riot_id" }], { player_id: "Kenzo", player_zone: "#KH1" })).toEqual({
      riot_id: "Kenzo#KH1",
    });
  });
  it("picks the server option", () => {
    const fields = [
      { key: "player_id" },
      {
        key: "server",
        type: "select",
        options: [
          { value: "asia", label: "Asia" },
          { value: "tw_hk_mo", label: "TW/HK/MO" },
        ],
      },
    ];
    expect(buildFields(fields, { player_id: "800123", player_zone: "Asia" })["server"]).toBe(
      "asia",
    );
    expect(buildFields(fields, { player_id: "800123", player_zone: "TW, HK, MO" })["server"]).toBe(
      "tw_hk_mo",
    );
  });
});

describe("FazerCards orders", () => {
  it("maps statuses", () => {
    expect(mapFazerStatus("completed")).toBe("completed");
    expect(mapFazerStatus("refund")).toBe("failed");
    expect(mapFazerStatus("processing")).toBe("processing");
  });

  it("places the order once with our order id", async () => {
    const f = fakeFetch({
      [mlbbOffers]: { body: offersBody },
      [create]: { body: { ok: true, order: { id: "fz-1", kind: "topup", status: "processing" } } },
    });
    const result = await placeFazerOrder(order, { apiKey: "key", fetchImpl: f });
    expect(result).toEqual({
      status: "processing",
      supplierStatus: "PROCESSING",
      supplierOrderId: "fz-1",
    });
    const call = f.mock.calls.find((c) => String(c[0]).endsWith(create))!;
    const init = call[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(order.id);
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("key");
    expect(JSON.parse(init.body as string)).toEqual({
      category_id: mlbbCategory,
      offer_id: "o-86",
      fields: { player_id: "12345678", server_id: "1234" },
    });
  });

  it("finds the category by name when the id is unknown", async () => {
    const f = fakeFetch({
      [mlbbOffers]: { status: 404, body: { ok: false, error: "not found", code: "NOT_FOUND" } },
      "/api/v2/topups": {
        body: {
          ok: true,
          items: [{ category_id: "cat-2", name: "Mobile Legends (Global)" }],
          meta: { has_more: false },
        },
      },
      "/api/v2/topups/offers?category_id=cat-2": { body: offersBody },
      [create]: { body: { ok: true, order: { id: "fz-2", status: "completed" } } },
    });
    const result = await placeFazerOrder(order, { apiKey: "key", fetchImpl: f });
    expect(result.status).toBe("completed");
    expect(result.supplierOrderId).toBe("fz-2");
  });

  it("does not buy packages delivered by hand", async () => {
    const f = fakeFetch({});
    const result = await placeFazerOrder(
      { ...order, game_id: "roblox", package_amt: "80 Robux" },
      { apiKey: "key", fetchImpl: f },
    );
    expect(result).toMatchObject({ supplierStatus: "NO_OFFER", notPlaced: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("never buys for more than the customer paid", async () => {
    const f = fakeFetch({ [mlbbOffers]: { body: offersBody } });
    const result = await placeFazerOrder(
      { ...order, price_usd: "1.10" },
      { apiKey: "key", fetchImpl: f },
    );
    expect(result).toMatchObject({ supplierStatus: "COST_ABOVE_PRICE", notPlaced: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("can retry after a low balance", async () => {
    const f = fakeFetch({
      [mlbbOffers]: { body: offersBody },
      [create]: {
        status: 402,
        body: { ok: false, error: "Insufficient balance", code: "INSUFFICIENT_BALANCE" },
      },
    });
    const result = await placeFazerOrder(order, { apiKey: "key", fetchImpl: f });
    expect(result).toMatchObject({
      status: "failed",
      supplierStatus: "INSUFFICIENT_BALANCE",
      notPlaced: true,
    });
  });

  it("keeps the order processing when the answer is lost", async () => {
    const f = fakeFetch({
      [mlbbOffers]: { body: offersBody },
      [create]: () => {
        throw new Error("timeout");
      },
    });
    const result = await placeFazerOrder(order, { apiKey: "key", fetchImpl: f });
    expect(result).toMatchObject({ status: "processing", supplierStatus: "UNCONFIRMED" });
    expect(result.notPlaced).toBeUndefined();
  });

  it("checks an order", async () => {
    const f = fakeFetch({
      "/api/v2/orders/fz-1": { body: { ok: true, order: { id: "fz-1", status: "completed" } } },
    });
    expect(await checkFazerOrder("fz-1", { apiKey: "key", fetchImpl: f })).toEqual({
      status: "completed",
      supplierStatus: "COMPLETED",
      supplierOrderId: "fz-1",
    });
  });
});
