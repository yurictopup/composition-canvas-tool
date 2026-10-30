import { getRequest } from "@tanstack/react-start/server";
import { allowRequest, ipKey, rule, TooManyRequestsError, type Rule } from "@/lib/rate-limit";

/**
 * The visitor's address, ready to use as a limit key (IPv6 grouped by /64).
 * The shop runs on Cloudflare Workers, where Cloudflare itself sets
 * cf-connecting-ip and replaces any value a visitor sends, so it always
 * wins. x-real-ip / x-forwarded-for can be typed by anyone; they are only a
 * fallback for hosts without Cloudflare (preview, local dev).
 */
export function clientIp(): string {
  const headers = getRequest()?.headers;
  if (!headers) return "unknown";
  const cf = headers.get("cf-connecting-ip");
  if (cf) return ipKey(cf);
  return ipKey(
    headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
  );
}

export type TakeResult = { allowed: boolean; retryAfterMs: number };
/** Takes one token from the shared bucket; throws when the database can't answer. */
export type Take = (rule: Rule) => Promise<TakeResult>;

/** The shared bucket in Postgres (public.rate_limit_take, service role only). */
export const takeFromDatabase: Take = async (r) => {
  const { adminDb } = await import("@/lib/delivery.server");
  const { data, error } = await adminDb().rpc("rate_limit_take", {
    p_key: r.key.slice(0, 200),
    p_capacity: r.capacity,
    p_refill_per_sec: r.capacity / r.perSeconds,
  });
  if (error) throw new Error(`rate_limit_take: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as
    { allowed?: boolean; retry_after_ms?: number } | null | undefined;
  if (!row || typeof row.allowed !== "boolean") throw new Error("rate_limit_take: empty answer");
  return { allowed: row.allowed, retryAfterMs: Number(row.retry_after_ms) || 0 };
};

let lastDbWarning = 0;

/**
 * Checks every rule; false (with how long to wait) as soon as one is used up.
 * Memory is asked first, so a flood landing on this Worker is turned away
 * without a database call. If the database is down the memory answer stands
 * (the shop keeps selling); the database's own order caps still apply.
 */
export async function checkLimits(
  rules: Rule[],
  take: Take = takeFromDatabase,
  now = Date.now(),
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  for (const r of rules) {
    if (!allowRequest(`mem:${r.key}`, r.capacity, r.perSeconds * 1000, now)) {
      return { allowed: false, retryAfterSeconds: Math.ceil(r.perSeconds / r.capacity) };
    }
  }
  for (const r of rules) {
    let result: TakeResult;
    try {
      result = await take(r);
    } catch (error) {
      if (now - lastDbWarning > 60_000) {
        lastDbWarning = now;
        console.error("[rate-limit] shared limit unavailable, using memory only:", error);
      }
      return { allowed: true };
    }
    if (!result.allowed) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
      };
    }
  }
  return { allowed: true };
}

/** Throws TooManyRequestsError when any rule is used up. */
export async function enforceLimits(rules: Rule[], take: Take = takeFromDatabase): Promise<void> {
  const result = await checkLimits(rules, take);
  if (!result.allowed) throw new TooManyRequestsError(result.retryAfterSeconds);
}

/** At most one Bakong question per order every 30 s, whoever is polling. */
export async function bankCheckAllowed(orderId: string, take: Take = takeFromDatabase) {
  return (await checkLimits([rule("bankCheckOrder", orderId)], take)).allowed;
}

/** Takes one of the shop's daily NBC requests; false once they are used up. */
export async function nbcBudgetAllowed(take: Take = takeFromDatabase) {
  return (await checkLimits([rule("nbcDay", "all")], take)).allowed;
}
