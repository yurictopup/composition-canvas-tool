// Account-name lookup through the GamesDrop partner API. Server-side only:
// the token must never reach the browser.

export type LookupResult =
  | { status: "found"; name: string }
  | { status: "not_found" }
  | { status: "unsupported" }
  | { status: "unavailable" };

export type LookupInput = { gameId: string; primary: string; secondary?: string | undefined };

type Fetch = typeof fetch;

const GAMESDROP_URL = "https://partner.gamesdrop.io";
const TIMEOUT_MS = 8000;

// GAMESDROP_OFFER_IDS maps our game ids to GamesDrop offer group ids,
// e.g. {"mlbb":1001,"ff":2002}. Games left out show "lookup not available".
export function parseOfferIds(raw: string | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [gameId, offerId] of Object.entries(parsed)) {
      if (typeof offerId === "number" && Number.isInteger(offerId) && offerId > 0)
        out[gameId] = offerId;
    }
    return out;
  } catch {
    return {};
  }
}

async function post(
  fetchImpl: Fetch,
  token: string,
  path: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetchImpl(`${GAMESDROP_URL}${path}`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GamesDrop ${path} returned HTTP ${res.status}`);
  return res.json();
}

// Server pickers (Genshin, Star Rail) use GamesDrop's own server values, so
// the label the player picked is matched against the offer's server list.
async function resolveServer(
  fetchImpl: Fetch,
  token: string,
  offerId: number,
  label: string,
): Promise<string | null> {
  const servers = await post(fetchImpl, token, "/api/v1/partner/product-offer/servers", {
    offerId,
  });
  if (!servers || typeof servers !== "object") return null;
  const wanted = label.trim().toLowerCase();
  for (const [name, value] of Object.entries(servers)) {
    if (name.trim().toLowerCase() === wanted && typeof value === "string") return value;
  }
  return null;
}

export async function lookupWithGamesDrop(
  input: LookupInput,
  opts: {
    token: string | undefined;
    offerIds: Record<string, number>;
    usesServerPicker: boolean;
    fetchImpl?: Fetch;
  },
): Promise<LookupResult> {
  const offerId = opts.offerIds[input.gameId];
  if (!opts.token || !offerId) return { status: "unsupported" };
  const fetchImpl = opts.fetchImpl ?? fetch;
  const primary = input.primary.trim();
  const secondary = input.secondary?.trim() ?? "";

  try {
    let gameUserId = primary;
    let gameServerId: string | undefined = secondary || undefined;
    if (input.gameId === "wildrift") {
      gameUserId = `${primary}#${secondary.replace(/^#/, "")}`;
      gameServerId = undefined;
    } else if (opts.usesServerPicker && secondary) {
      const server = await resolveServer(fetchImpl, opts.token, offerId, secondary);
      if (!server) return { status: "unavailable" };
      gameServerId = server;
    }

    const data = (await post(fetchImpl, opts.token, "/api/v1/offers/check-game-data", {
      offerId,
      gameUserId,
      ...(gameServerId ? { gameServerId } : {}),
    })) as { status?: unknown; gameUserLogin?: unknown };

    if (data.status === "VALID") {
      const name = typeof data.gameUserLogin === "string" ? data.gameUserLogin.trim() : "";
      return name ? { status: "found", name } : { status: "unavailable" };
    }
    if (data.status === "INVALID") return { status: "not_found" };
    return { status: "unavailable" };
  } catch (error) {
    console.error("[player-lookup]", error instanceof Error ? error.message : error);
    return { status: "unavailable" };
  }
}

// Short-lived cache so repeated Check ID taps don't spend supplier quota.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { result: LookupResult; expires: number }>();

export async function cachedLookup(
  input: LookupInput,
  run: () => Promise<LookupResult>,
): Promise<LookupResult> {
  const key = `${input.gameId}|${input.primary.trim()}|${input.secondary?.trim() ?? ""}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.result;
  const result = await run();
  // Only definite answers are cached; outages should be retried.
  if (result.status === "found" || result.status === "not_found") {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { result, expires: now + CACHE_TTL_MS });
  }
  return result;
}
