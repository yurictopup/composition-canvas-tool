import { describe, expect, it, vi } from "vitest";
import {
  checkGamesDropOrder,
  mapSupplierStatus,
  placeGamesDropOrder,
  searchGamesDropCatalog,
} from "@/lib/delivery";

type Route = { status?: number; body: unknown };

function fakeFetch(routes: Record<string, Route | (() => never)>) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    const route = routes[path];
    if (!route) throw new Error(`unexpected ${path}`);
    if (typeof route === "function") return route();
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function bodyFor(f: ReturnType<typeof vi.fn>, path: string) {
  const call = f.mock.calls.find((c) => new URL(String(c[0])).pathname === path);
  return JSON.parse((call![1] as RequestInit).body as string);
}

const findOne = "/api/v1/offers/find-one";
const create = "/api/v1/offers/create-order";
const status = "/api/v1/offers/order-status";
const order = {
  id: "0b8c1d2e-0000-4000-8000-000000000001",
  game_id: "mlbb",
  player_id: "12345678",
  player_zone: "1234",
};
const opts = { token: "tok", offerId: 1001, usesServerPicker: false };

describe("GamesDrop order statuses", () => {
  it("maps terminal and in-flight statuses", () => {
    expect(mapSupplierStatus("COMPLETED")).toBe("completed");
    for (const s of ["CANCELED", "FAILED", "REFUND"]) expect(mapSupplierStatus(s)).toBe("failed");
    for (const s of ["SUBMITTED", "PROCESSING", undefined])
      expect(mapSupplierStatus(s)).toBe("processing");
  });
});

describe("Placing a GamesDrop order", () => {
  it("buys at GamesDrop's price with the order id as transaction id", async () => {
    const f = fakeFetch({
      [findOne]: { body: { price: 1.02 } },
      [create]: { body: { order_id: 555, status: "COMPLETED" } },
    });
    const result = await placeGamesDropOrder(order, { ...opts, fetchImpl: f });
    expect(result).toEqual({
      status: "completed",
      supplierStatus: "COMPLETED",
      supplierOrderId: "555",
    });
    expect(bodyFor(f, create)).toEqual({
      offerId: 1001,
      price: 1.02,
      transactionId: order.id,
      useBalance: true,
      customer: { gameUserId: "12345678", gameServerId: "1234" },
    });
  });

  it("keeps a submitted order processing", async () => {
    const f = fakeFetch({
      [findOne]: { body: { price: 1 } },
      [create]: { body: { order_id: 7, status: "SUBMITTED" } },
    });
    expect((await placeGamesDropOrder(order, { ...opts, fetchImpl: f })).status).toBe("processing");
  });

  it("marks refusals like low balance as not placed, so they can be retried", async () => {
    const f = fakeFetch({
      [findOne]: { body: { price: 1 } },
      [create]: { status: 400, body: { code: "INSUFFICIENT_BALANCE", message: "Top up" } },
    });
    const result = await placeGamesDropOrder(order, { ...opts, fetchImpl: f });
    expect(result).toMatchObject({
      status: "failed",
      supplierStatus: "INSUFFICIENT_BALANCE",
      notPlaced: true,
    });
  });

  it("treats a timeout as unknown, never as failed", async () => {
    const f = fakeFetch({
      [findOne]: { body: { price: 1 } },
      [create]: () => {
        throw new Error("timeout");
      },
    });
    const result = await placeGamesDropOrder(order, { ...opts, fetchImpl: f });
    expect(result).toMatchObject({ status: "processing", supplierStatus: "UNKNOWN" });
    expect(result.notPlaced).toBeUndefined();
  });

  it("does not buy without a GamesDrop price", async () => {
    const f = fakeFetch({ [findOne]: { body: {} } });
    const result = await placeGamesDropOrder(order, { ...opts, fetchImpl: f });
    expect(result).toMatchObject({ status: "failed", notPlaced: true });
    expect(f.mock.calls.some((c) => String(c[0]).endsWith(create))).toBe(false);
  });
});

describe("Checking a GamesDrop order", () => {
  it("reads the order status by GamesDrop order id", async () => {
    const f = fakeFetch({ [status]: { body: { orderId: 555, status: "COMPLETED" } } });
    expect(await checkGamesDropOrder("555", { token: "tok", fetchImpl: f })).toEqual({
      status: "completed",
      supplierStatus: "COMPLETED",
      supplierOrderId: "555",
    });
    expect(bodyFor(f, status)).toEqual({ orderId: 555 });
  });
});

describe("GamesDrop catalog search", () => {
  it("returns offer group ids and drops rows without one", async () => {
    const f = fakeFetch({
      "/api/v1/offers/sync": {
        body: {
          rows: [
            {
              offerGroupId: 1001,
              offerGroupName: "86 Diamonds",
              productName: "Mobile Legends",
              price: 1.2,
              currency: "USD",
            },
            { offerGroupName: "broken" },
          ],
        },
      },
    });
    expect(await searchGamesDropCatalog("Mobile", { token: "tok", fetchImpl: f })).toEqual([
      {
        offerId: 1001,
        name: "86 Diamonds",
        product: "Mobile Legends",
        price: 1.2,
        currency: "USD",
      },
    ]);
  });
});
