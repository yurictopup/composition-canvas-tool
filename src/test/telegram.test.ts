import { describe, expect, it, vi } from "vitest";
import { findGame, getPackages } from "@/lib/games";
import { fazerTelegram } from "@/lib/fazercards-catalog";
import { placeFazerTelegram } from "@/lib/fazercards";
import { telegramUsername, validatePlayerId } from "@/lib/player-id";
import { lookupTelegram } from "@/lib/player-lookup";

type Route = { status?: number; body: unknown };

function fakeFetch(routes: Record<string, Route | (() => never)>) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = new URL(String(url));
    const route = routes[u.pathname];
    if (!route) throw new Error(`unexpected ${u.pathname}`);
    if (typeof route === "function") return route();
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const stars = { body: { ok: true, price_per_star: "0.0152000", min_amount: 50, max_amount: 10000 } };
const premium = {
  body: {
    ok: true,
    plans: [
      { months: 3, price_usd: "12.1800" },
      { months: 6, price_usd: "16.2400" },
      { months: 12, price_usd: "29.4300" },
    ],
  },
};
const order = {
  id: "0b8c1d2e-0000-4000-8000-0000000000aa",
  game_id: "tgstars",
  package_amt: "100 Stars",
  player_id: "@Yuric_Store",
  price_usd: 1.75,
};

function sentBody(f: ReturnType<typeof fakeFetch>, path: string) {
  const call = f.mock.calls.find((c) => new URL(String(c[0])).pathname === path)!;
  const init = call[1] as RequestInit;
  return {
    body: JSON.parse(init.body as string) as Record<string, unknown>,
    headers: init.headers as Record<string, string>,
  };
}

describe("Telegram usernames", () => {
  it("accepts usernames with or without @", () => {
    for (const id of ["yuric_store", "@Yuric_Store", "abcde"]) {
      expect(validatePlayerId("tgstars", id), id).toBeNull();
      expect(validatePlayerId("tgpremium", id), id).toBeNull();
    }
  });

  it("rejects phone numbers, short names, spaces and leading digits", () => {
    for (const id of ["", "+85512345678", "abcd", "yuric store", "1yuric", "a".repeat(33)]) {
      expect(validatePlayerId("tgstars", id), id).not.toBeNull();
    }
  });

  it("sends the username without @", () => {
    expect(telegramUsername(" @Yuric_Store ")).toBe("Yuric_Store");
  });
});

describe("lookupTelegram", () => {
  const page = (title: string | null, extra: string) => {
    const html = `<div class="tgme_page_title"${title === null ? " hidden" : ""}><span dir="auto">${title ?? ""}</span></div><div class="tgme_page_extra">${extra}</div>`;
    return vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
  };

  it("shows the account name for a person", async () => {
    expect(await lookupTelegram("@SAYBRACHNHA", page("SAY BRACHNHA", "@SAYBRACHNHA"))).toEqual({
      status: "found",
      name: "SAY BRACHNHA (@SAYBRACHNHA)",
    });
    expect(await lookupTelegram("tom_jerry", page("Tom &amp; Jerry", "@tom_jerry"))).toEqual({
      status: "found",
      name: "Tom & Jerry (@tom_jerry)",
    });
  });

  it("does not accept unknown usernames, channels or groups", async () => {
    expect((await lookupTelegram("nobody_here", page(null, ""))).status).toBe("not_found");
    expect((await lookupTelegram("telegram", page("Telegram News", "9 221 106 subscribers"))).status).toBe("not_found");
    expect((await lookupTelegram("somegroup", page("A Group", "1 200 members, 30 online"))).status).toBe("not_found");
  });

  it("says unavailable when t.me can't be reached", async () => {
    const down = vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    expect((await lookupTelegram("yuric_store", down)).status).toBe("unavailable");
  });
});

describe("Telegram packages", () => {
  it("every package maps to a FazerCards buy", () => {
    for (const gameId of ["tgstars", "tgpremium"]) {
      const unit = findGame(gameId)!.unit;
      const packages = getPackages(gameId);
      expect(packages.length).toBeGreaterThan(0);
      for (const p of packages) expect(fazerTelegram[gameId]!(`${p.amt} ${unit}`), p.amt).not.toBeNull();
    }
    expect(fazerTelegram["tgstars"]!("100 Stars")).toEqual({ kind: "stars", quantity: 100 });
    expect(fazerTelegram["tgpremium"]!("6 Months")).toEqual({ kind: "premium", months: 6 });
    expect(fazerTelegram["tgpremium"]!("4 Months")).toBeNull();
    expect(fazerTelegram["tgstars"]!("10 Stars")).toBeNull();
  });
});

describe("placeFazerTelegram", () => {
  it("buys Stars for the username, once per order", async () => {
    const f = fakeFetch({
      "/api/v2/telegram/stars": stars,
      "/api/v2/telegram/stars/buy": { status: 201, body: { ok: true, order: { id: "ord-1", status: "created" } } },
    });
    const result = await placeFazerTelegram(order, { apiKey: "key", fetchImpl: f });
    expect(result).toEqual({ status: "processing", supplierStatus: "CREATED", supplierOrderId: "ord-1" });
    const sent = sentBody(f, "/api/v2/telegram/stars/buy");
    expect(sent.body).toEqual({ telegram_username: "Yuric_Store", quantity: 100 });
    expect(sent.headers["Idempotency-Key"]).toBe(order.id);
  });

  it("buys Premium by months", async () => {
    const f = fakeFetch({
      "/api/v2/telegram/premium": premium,
      "/api/v2/telegram/premium/buy": { status: 201, body: { ok: true, order: { id: "ord-2", status: "completed" } } },
    });
    const result = await placeFazerTelegram(
      { ...order, game_id: "tgpremium", package_amt: "3 Months", price_usd: 13.89 },
      { apiKey: "key", fetchImpl: f },
    );
    expect(result.status).toBe("completed");
    expect(sentBody(f, "/api/v2/telegram/premium/buy").body).toEqual({
      telegram_username: "Yuric_Store",
      months: 3,
    });
  });

  it("never buys for more than the customer paid", async () => {
    const f = fakeFetch({ "/api/v2/telegram/stars": stars });
    const result = await placeFazerTelegram({ ...order, price_usd: 1.0 }, { apiKey: "key", fetchImpl: f });
    expect(result).toMatchObject({ status: "failed", supplierStatus: "COST_ABOVE_PRICE", notPlaced: true });
    expect(f.mock.calls.some((c) => String(c[0]).endsWith("/buy"))).toBe(false);
  });

  it("does not buy an unknown package", async () => {
    const f = fakeFetch({});
    const result = await placeFazerTelegram({ ...order, package_amt: "7 Stars" }, { apiKey: "key", fetchImpl: f });
    expect(result).toMatchObject({ supplierStatus: "NO_OFFER", notPlaced: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("keeps a server error UNKNOWN (maybe bought) and a refusal failed", async () => {
    const down = fakeFetch({
      "/api/v2/telegram/stars": stars,
      "/api/v2/telegram/stars/buy": { status: 502, body: { ok: false, error: "bad gateway" } },
    });
    expect(await placeFazerTelegram(order, { apiKey: "key", fetchImpl: down })).toMatchObject({
      status: "processing",
      supplierStatus: "UNKNOWN",
    });
    const refused = fakeFetch({
      "/api/v2/telegram/stars": stars,
      "/api/v2/telegram/stars/buy": { status: 400, body: { ok: false, error: "username not found" } },
    });
    expect(await placeFazerTelegram(order, { apiKey: "key", fetchImpl: refused })).toMatchObject({
      status: "failed",
      supplierStatus: "HTTP_400",
      notPlaced: true,
    });
  });
});
