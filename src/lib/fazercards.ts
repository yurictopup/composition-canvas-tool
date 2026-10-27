// Buying a paid order's package from FazerCards (public API v2). Server-side only.
// Our order id is sent as the Idempotency-Key, so a retry of the same order can
// never buy it twice.
import type { DeliveryOrder, DeliveryResult } from "@/lib/delivery";
import { fazerCatalog } from "@/lib/fazercards-catalog";

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

/** The FazerCards offer name for one of our packages, or null when it is delivered by hand. */
export function fazerOfferFor(gameId: string, packageAmt: string) {
  const game = fazerCatalog[gameId];
  const offerName = game?.offers[packageAmt];
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

// Errors that mean FazerCards did not take the order, so it is safe to retry later.
const REJECTED =
  /balance|insufficient|invalid|validation|not_found|unavailable|out_of_stock|unauthor|forbidden/i;

export async function placeFazerOrder(
  order: DeliveryOrder & { package_amt: string; price_usd?: number | string | null },
  opts: Opts,
): Promise<DeliveryResult> {
  const target = fazerOfferFor(order.game_id, order.package_amt);
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
    if (code && REJECTED.test(code)) {
      return { status: "failed", supplierStatus: code.toUpperCase(), message, notPlaced: true };
    }
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 409) {
      return { status: "failed", supplierStatus: `HTTP_${status}`, message, notPlaced: true };
    }
    // A timeout or server error may still have placed the order; keep it
    // processing so the owner checks before anything is bought again.
    return { status: "processing", supplierStatus: "UNCONFIRMED", message };
  }
}

export async function checkFazerOrder(
  supplierOrderId: string,
  opts: Opts,
): Promise<DeliveryResult> {
  try {
    const res = await call(opts, `/orders/${encodeURIComponent(supplierOrderId)}`);
    const order = (res.order ?? {}) as { status?: unknown };
    return {
      status: mapFazerStatus(order.status),
      supplierStatus: String(order.status ?? "UNKNOWN").toUpperCase(),
      supplierOrderId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "processing", supplierStatus: "UNCONFIRMED", supplierOrderId, message };
  }
}
