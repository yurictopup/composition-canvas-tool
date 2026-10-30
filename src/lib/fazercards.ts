// Buying a paid order's package from FazerCards (public API v2). Server-side only.
// Our order id is sent as the Idempotency-Key, so a retry of the same order can
// never buy it twice.
import type { DeliveryOrder, DeliveryResult } from "@/lib/delivery";
import { fazerCatalog, fazerGiftCards } from "@/lib/fazercards-catalog";
import type { LookupInput, LookupResult } from "@/lib/player-lookup";

type Fetch = typeof fetch;
type Opts = { apiKey: string; fetchImpl?: Fetch };

const BASE = "https://api.fzr.cards/api/v2";

type ApiJson = {
  ok?: boolean;
  code?: unknown;
  error?: unknown;
  items?: unknown;
  meta?: unknown;
  offers?: unknown;
  fields?: unknown;
  order?: unknown;
};

export class FazerCardsError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}

async function call(
  opts: Opts,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiJson> {
  const res = await (opts.fetchImpl ?? fetch)(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "X-API-Key": opts.apiKey,
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  let json: ApiJson = {};
  try {
    json = (await res.json()) as ApiJson;
  } catch {
    // An empty or HTML body is reported below by its HTTP status.
  }
  if (!res.ok || json.ok === false) {
    const code = typeof json.code === "string" ? json.code : undefined;
    const error = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new FazerCardsError(`FazerCards: ${error}`, code, res.status);
  }
  return json;
}

/**
 * The FazerCards offer name for one of our packages, or null when it is delivered by hand.
 * A product the owner picked on /admin (package_offers.fazer_offer) wins over the built-in list.
 */
export function fazerOfferFor(gameId: string, packageAmt: string, picked?: string | null) {
  const game = fazerCatalog[gameId];
  const offerName = picked || game?.offers[packageAmt];
  return game && offerName ? { ...game, offerName } : null;
}

type Option = string | { value?: unknown; label?: unknown; name?: unknown };
type Field = { key: string; label?: string; type?: string; options?: Option[] };
type Offer = { offer_id: string | number; name: string; price_usd?: number };
type Offers = { offers: Offer[]; fields: Field[] };

function readOffers(json: ApiJson): Offers {
  return {
    offers: Array.isArray(json.offers) ? (json.offers as Offer[]) : [],
    fields: Array.isArray(json.fields) ? (json.fields as Field[]) : [],
  };
}

async function findCategoryId(opts: Opts, name: string): Promise<string | null> {
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const query = `?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const json = await call(opts, `/topups${query}`);
    const items = Array.isArray(json.items)
      ? (json.items as { category_id: string; name: string }[])
      : [];
    const hit = items.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    if (hit) return hit.category_id;
    const meta = json.meta as { next_cursor?: string; has_more?: boolean } | undefined;
    if (!meta?.has_more || !meta.next_cursor) return null;
    cursor = meta.next_cursor;
  }
  return null;
}

/** Offers and order fields of a category. Falls back to looking the category up by name. */
async function loadOffers(
  opts: Opts,
  game: { category: string; categoryId: string },
): Promise<{ categoryId: string } & Offers> {
  try {
    const json = await call(opts, `/topups/offers?category_id=${game.categoryId}`);
    return { categoryId: game.categoryId, ...readOffers(json) };
  } catch (error) {
    if (!(error instanceof FazerCardsError) || error.httpStatus === 401) throw error;
    const categoryId = await findCategoryId(opts, game.category);
    if (!categoryId)
      throw new FazerCardsError(
        `FazerCards has no "${game.category}" category.`,
        "CATEGORY_NOT_FOUND",
      );
    const json = await call(opts, `/topups/offers?category_id=${categoryId}`);
    return { categoryId, ...readOffers(json) };
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function optionValue(option: Option): { value: string; label: string } {
  if (typeof option === "string") return { value: option, label: option };
  const value = String(option.value ?? option.name ?? option.label ?? "");
  return { value, label: String(option.label ?? option.name ?? value) };
}

/** Fills FazerCards' order fields from the customer's player ID and zone/server/tagline. */
export function buildFields(
  fields: Field[],
  order: Pick<DeliveryOrder, "player_id" | "player_zone">,
): Record<string, string> {
  const id = order.player_id.trim();
  const zone = (order.player_zone ?? "").trim();
  const out: Record<string, string> = {};
  for (const field of fields) {
    const key = field.key;
    if (key === "riot_id") {
      out[key] = zone ? `${id}#${zone.replace(/^#/, "")}` : id;
    } else if (/server|zone/.test(key)) {
      if (!zone) continue;
      if (field.options?.length) {
        const wanted = norm(zone);
        const match =
          field.options
            .map(optionValue)
            .find((o) => norm(o.value) === wanted || norm(o.label) === wanted) ??
          // "TW, HK, MO" may be labelled differently, e.g. "TW/HK/MO".
          field.options.map(optionValue).find((o) => norm(o.label).includes(wanted.slice(0, 4)));
        out[key] = match ? match.value : zone;
      } else {
        out[key] = zone;
      }
    } else {
      out[key] = id;
    }
  }
  return out;
}

// FazerCards order statuses: processing, completed, refund.
export function mapFazerStatus(raw: unknown): DeliveryResult["status"] {
  const s = String(raw ?? "").toLowerCase();
  if (s === "completed" || s === "success" || s === "done") return "completed";
  if (["refund", "refunded", "failed", "canceled", "cancelled", "error"].includes(s))
    return "failed";
  return "processing";
}

/** HTTP answers after which an order may or may not have been placed. */
export function inDoubtStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 409;
}

// Errors that mean FazerCards did not take the order, so it is safe to retry later.
const REJECTED =
  /balance|insufficient|invalid|validation|not_found|unavailable|out_of_stock|unauthor|forbidden/i;

export async function placeFazerOrder(
  order: DeliveryOrder & {
    package_amt: string;
    fazer_offer?: string | null;
    price_usd?: number | string | null;
  },
  opts: Opts,
): Promise<DeliveryResult> {
  const target = fazerOfferFor(order.game_id, order.package_amt, order.fazer_offer);
  if (!target) {
    return {
      status: "failed",
      supplierStatus: "NO_OFFER",
      message: `${order.package_amt} is delivered by hand.`,
      notPlaced: true,
    };
  }
  try {
    const { categoryId, offers, fields } = await loadOffers(opts, target);
    const offer = offers.find((o) => o.name.trim() === target.offerName);
    if (!offer) {
      return {
        status: "failed",
        supplierStatus: "OFFER_NOT_FOUND",
        message: `FazerCards has no "${target.offerName}" in ${target.category} now.`,
        notPlaced: true,
      };
    }
    // Never buy for more than the customer paid (a wrong price row or a
    // supplier price jump would otherwise lose money on every order).
    const paid = Number(order.price_usd);
    if (order.price_usd != null && typeof offer.price_usd === "number" && offer.price_usd > paid) {
      return {
        status: "failed",
        supplierStatus: "COST_ABOVE_PRICE",
        message: `FazerCards cost $${offer.price_usd.toFixed(2)} is above the paid $${paid.toFixed(2)}.`,
        notPlaced: true,
      };
    }
    const res = await call(opts, "/topups/order", {
      method: "POST",
      headers: { "Idempotency-Key": order.id },
      body: {
        category_id: categoryId,
        offer_id: offer.offer_id,
        fields: buildFields(fields, order),
      },
    });
    const placed = (res.order ?? {}) as { id?: unknown; status?: unknown };
    return {
      status: mapFazerStatus(placed.status),
      supplierStatus: String(placed.status ?? "processing").toUpperCase(),
      ...(placed.id != null ? { supplierOrderId: String(placed.id) } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[delivery]", message);
    const code = error instanceof FazerCardsError ? (error.code ?? "") : "";
    const status = error instanceof FazerCardsError ? error.httpStatus : undefined;
    // A 5xx, 408 or 409 may come after FazerCards took the order, whatever code
    // its body carries (e.g. BALANCE_UNAVAILABLE), so it is never read as a refusal.
    if (status !== undefined && inDoubtStatus(status)) {
      return { status: "processing", supplierStatus: "UNKNOWN", message };
    }
    if (code && REJECTED.test(code)) {
      return { status: "failed", supplierStatus: code.toUpperCase(), message, notPlaced: true };
    }
    if (status && status >= 400 && status < 500) {
      return { status: "failed", supplierStatus: `HTTP_${status}`, message, notPlaced: true };
    }
    // A timeout or server error may still have placed the order; keep it
    // processing as UNKNOWN: it is never sent again by itself, the owner checks first.
    return { status: "processing", supplierStatus: "UNKNOWN", message };
  }
}

type GiftOffer = {
  card_id: string | null;
  name: string;
  price_usd?: string | number;
  stock?: number;
};

/**
 * Buys one gift card code for a paid order (Roblox). Same safety rules as top-ups: the order
 * id is the Idempotency-Key, a supplier price above what the buyer paid is refused, and an
 * answer that never came back leaves the order UNKNOWN for the owner to check.
 */
export async function placeFazerGiftCard(
  order: { id: string; game_id: string; package_amt: string; price_usd?: number | string | null },
  opts: Opts & { picked?: string | null },
): Promise<DeliveryResult> {
  const game = fazerGiftCards[order.game_id];
  const offerName = opts.picked || game?.offers[order.package_amt];
  if (!game || !offerName) {
    return {
      status: "failed",
      supplierStatus: "NO_OFFER",
      message: `${order.package_amt} is delivered by hand.`,
      notPlaced: true,
    };
  }
  try {
    const list = await call(
      opts,
      `/giftcards/cards?category_id=${encodeURIComponent(game.categoryId)}`,
    );
    const offers = Array.isArray(list.offers) ? (list.offers as GiftOffer[]) : [];
    const offer = offers.find((o) => o.name.trim() === offerName);
    if (!offer?.card_id) {
      return {
        status: "failed",
        supplierStatus: "OFFER_NOT_FOUND",
        message: `FazerCards has no "${offerName}" in ${game.category} now.`,
        notPlaced: true,
      };
    }
    if (typeof offer.stock === "number" && offer.stock < 1) {
      return {
        status: "failed",
        supplierStatus: "OUT_OF_STOCK",
        message: `${offerName} is out of stock at FazerCards.`,
        notPlaced: true,
      };
    }
    const cost = Number(offer.price_usd);
    const paid = Number(order.price_usd);
    if (order.price_usd != null && Number.isFinite(cost) && cost > paid) {
      return {
        status: "failed",
        supplierStatus: "COST_ABOVE_PRICE",
        message: `FazerCards cost ${cost.toFixed(2)} is above the paid ${paid.toFixed(2)}.`,
        notPlaced: true,
      };
    }
    const res = await call(opts, "/giftcards/order", {
      method: "POST",
      headers: { "Idempotency-Key": order.id },
      body: { category_id: game.categoryId, card_id: offer.card_id, quantity: 1 },
    });
    const placed = (res.order ?? {}) as { id?: unknown; status?: unknown };
    const codes = extractCodes(placed);
    return {
      status: codes.length ? "completed" : mapFazerStatus(placed.status),
      supplierStatus: String(placed.status ?? "processing").toUpperCase(),
      ...(placed.id != null ? { supplierOrderId: String(placed.id) } : {}),
      ...(codes.length ? { codes } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[delivery] gift card", message);
    const code = error instanceof FazerCardsError ? (error.code ?? "") : "";
    const status = error instanceof FazerCardsError ? error.httpStatus : undefined;
    if (status !== undefined && inDoubtStatus(status)) {
      return { status: "processing", supplierStatus: "UNKNOWN", message };
    }
    if (code && REJECTED.test(code)) {
      return { status: "failed", supplierStatus: code.toUpperCase(), message, notPlaced: true };
    }
    if (status && status >= 400 && status < 500) {
      return { status: "failed", supplierStatus: `HTTP_${status}`, message, notPlaced: true };
    }
    return { status: "processing", supplierStatus: "UNKNOWN", message };
  }
}

/** The codes of a finished gift card order: strings, or objects holding a code/key/pin. */
export function extractCodes(order: unknown): string[] {
  const o = (order ?? {}) as { cards?: unknown; keys?: unknown; codes?: unknown };
  const list = [o.cards, o.codes, o.keys].find((v) => Array.isArray(v) && v.length) as
    | unknown[]
    | undefined;
  return (list ?? [])
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const c = (item ?? {}) as Record<string, unknown>;
      const v = c.code ?? c.key ?? c.pin ?? c.card ?? c.serial;
      return typeof v === "string" ? v.trim() : "";
    })
    .filter(Boolean);
}

export async function checkFazerOrder(
  supplierOrderId: string,
  opts: Opts,
): Promise<DeliveryResult> {
  try {
    const res = await call(opts, `/orders/${encodeURIComponent(supplierOrderId)}`);
    const order = (res.order ?? {}) as { status?: unknown };
    const codes = extractCodes(order);
    return {
      status: mapFazerStatus(order.status),
      supplierStatus: String(order.status ?? "UNKNOWN").toUpperCase(),
      supplierOrderId,
      ...(codes.length ? { codes } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "processing", supplierStatus: "UNCONFIRMED", supplierOrderId, message };
  }
}

export type FazerAccount = {
  balance: number;
  currency: string;
  plan: string | null;
  planExpiresAt: string | null;
  subscriptionActive: boolean;
};

/** The reseller balance and plan, for the owner's stock card. */
export async function fetchFazerAccount(opts: Opts): Promise<FazerAccount> {
  const [bal, me] = await Promise.all([call(opts, "/balance"), call(opts, "/me")]);
  const b = bal as { balance?: unknown; currency?: unknown };
  const m = me as { plan?: unknown; planExpiresAt?: unknown; subscriptionActive?: unknown };
  return {
    balance: Number(b.balance ?? 0),
    currency: typeof b.currency === "string" ? b.currency : "USD",
    plan: typeof m.plan === "string" ? m.plan : null,
    planExpiresAt: typeof m.planExpiresAt === "string" ? m.planExpiresAt : null,
    subscriptionActive: m.subscriptionActive === true,
  };
}

// ── Player name check (POST /topups/validate-id) ──────────────────────────

type ValidateGame = { category_id: string; name: string; fields: Field[] };

// FazerCards says the list of games it can check changes, so it is re-read hourly.
const VALIDATE_LIST_TTL_MS = 60 * 60 * 1000;
let validateList: { items: ValidateGame[]; expires: number } | null = null;

export function resetValidateListCache() {
  validateList = null;
}

async function validateGames(opts: Opts): Promise<ValidateGame[]> {
  const now = Date.now();
  if (validateList && validateList.expires > now) return validateList.items;
  const json = await call(opts, "/topups/validate-id");
  const items = Array.isArray(json.items)
    ? (json.items as ValidateGame[]).filter(
        (item) => typeof item?.category_id === "string" && typeof item?.name === "string",
      )
    : [];
  validateList = { items, expires: now + VALIDATE_LIST_TTL_MS };
  return items;
}

/**
 * The FazerCards check for one of our games, matched by name: "Mobile Legends" finds
 * "Mobile Legends: Bang Bang", and "Wild Rift" never borrows the League of Legends check.
 */
export function pickValidateGame(
  items: ValidateGame[],
  gameId: string,
  gameName: string | undefined,
): ValidateGame | null {
  const category = fazerCatalog[gameId]?.category;
  const wanted = [gameName, category, category?.replace(/\(.*\)/, "")]
    .filter((s): s is string => !!s)
    .map(norm)
    .filter(Boolean);
  const names = (item: ValidateGame) => [norm(item.name), norm(item.category_id)];
  const prefix = (n: string, w: string) =>
    n.startsWith(w) && (w.includes("wildrift") || !n.includes("wildrift"));
  return (
    items.find((item) => names(item).some((n) => n === norm(gameId) || wanted.includes(n))) ??
    items.find((item) => names(item).some((n) => wanted.some((w) => prefix(n, w)))) ??
    null
  );
}

/** The player's in-game name from FazerCards, or "unsupported" when it can't check this game. */
export async function validateFazerPlayer(
  input: LookupInput,
  opts: Opts & { gameName?: string | undefined },
): Promise<LookupResult> {
  try {
    const game = pickValidateGame(await validateGames(opts), input.gameId, opts.gameName);
    if (!game) return { status: "unsupported" };
    const fields = buildFields(Array.isArray(game.fields) ? game.fields : [], {
      player_id: input.primary,
      player_zone: input.secondary ?? null,
    });
    const res = (await call(opts, "/topups/validate-id", {
      method: "POST",
      body: { category_id: game.category_id, fields },
    })) as ApiJson & { valid?: unknown; player_name?: unknown; nickname?: unknown };
    if (res.valid === false) return { status: "not_found" };
    const raw = res.player_name ?? res.nickname;
    const name = typeof raw === "string" ? raw.trim() : "";
    return res.valid === true && name ? { status: "found", name } : { status: "unavailable" };
  } catch (error) {
    console.error("[player-lookup] fazercards", error instanceof Error ? error.message : error);
    return { status: "unavailable" };
  }
}

// ── Order list (GET /orders) ──────────────────────────────────────────────

export type FazerOrder = {
  id: string;
  status: string;
  game: string;
  product: string;
  cost: number;
  createdAt: string;
  image: string | null;
};

const firstText = (...values: unknown[]) => {
  const hit = values.find((v) => typeof v === "string" && v.trim());
  return typeof hit === "string" ? hit.trim() : "";
};

// Order fields are not documented, so the cost is the first known money field,
// else any number-like field whose name reads as a price (e.g. "0.388").
const asMoney = (v: unknown) => {
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return v !== "" && Number.isFinite(n) ? n : null;
};
function orderCost(o: Record<string, unknown>): number {
  for (const key of [
    "payUsd", "pay_usd", "amountUsd", "amount_usd", "priceUsd", "price_usd",
    "totalUsd", "total_usd", "costUsd", "cost_usd", "amount", "price", "total", "cost", "sum",
  ]) {
    const n = asMoney(o[key]);
    if (n !== null) return n;
  }
  for (const [key, value] of Object.entries(o)) {
    if (!/price|amount|cost|total|sum|pay|charge/i.test(key)) continue;
    const n =
      asMoney(value) ??
      (value && typeof value === "object"
        ? asMoney((value as Record<string, unknown>).usd ?? (value as Record<string, unknown>).amount)
        : null);
    if (n !== null) return n;
  }
  return 0;
}

/** The newest FazerCards orders with what each one really cost, for the owner's list on /admin. */
export async function listFazerOrders(opts: Opts, limit = 50): Promise<FazerOrder[]> {
  const json = await call(opts, `/orders?page=1&limit=${limit}`);
  const items = Array.isArray(json.items) ? (json.items as Record<string, unknown>[]) : [];
  return items
    .map((o) => ({
      id: firstText(o.id, o.order_id, o.orderId),
      status: firstText(o.status).toLowerCase(),
      game: firstText(
        o.gameName, o.game_name, o.categoryName, o.category_name, o.category,
        o.serviceName, o.service_name, o.game, o.title,
      ),
      product: firstText(o.productName, o.product_name, o.offerName, o.offer_name, o.item),
      cost: orderCost(o),
      createdAt: firstText(o.createdAt, o.created_at),
      image: firstText(o.image, o.image_url, o.imageUrl, o.icon_url) || null,
    }))
    .filter((o) => o.id);
}
