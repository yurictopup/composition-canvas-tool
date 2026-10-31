// Request limits. Two layers:
//  1. allowRequest: a counter in this Worker's memory. Free and instant, but
//     each Cloudflare Worker copy counts on its own, so it only stops a flood
//     that lands on one copy.
//  2. The shared token bucket in Postgres (public.rate_limit_take, see
//     rate-limit.server.ts), which every Worker copy sees.
// Memory is asked first, so a flood from one place costs no database calls.
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_KEYS = 5000;

/** True when the call is allowed; false once `limit` calls were made in `windowMs`. */
export function allowRequest(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
      if (windows.size >= MAX_KEYS) windows.delete(windows.keys().next().value!);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export class TooManyRequestsError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    const wait =
      retryAfterSeconds <= 60 ? "a minute" : `${Math.ceil(retryAfterSeconds / 60)} minutes`;
    super(`Too many requests. Please wait ${wait} and try again.`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Memory-only limit (kept for callers that don't need the shared one). */
export function enforceLimit(key: string, limit: number, windowMs = 60_000) {
  if (!allowRequest(key, limit, windowMs))
    throw new TooManyRequestsError(Math.ceil(windowMs / 1000));
}

/** A budget: `capacity` calls at once, refilled evenly over `perSeconds`. */
export type Budget = { capacity: number; perSeconds: number };

/** One limit to check: what is counted (the key) and its budget. */
export type Rule = Budget & { key: string };

// Every limit in one place. Keys get the visitor's IP or user id added.
export const LIMITS = {
  // Guest checkout (no sign-in): new orders and their KHQR.
  guestOrderIp: { capacity: 5, perSeconds: 600 },
  guestView: { capacity: 30, perSeconds: 60 },
  guestPayStartIp: { capacity: 10, perSeconds: 600 },
  // Trying promo codes: enough to fix a typo, too few to guess codes.
  promoCheckIp: { capacity: 10, perSeconds: 600 },
  // Order page polls every 5 s (12 a minute); a little room for two tabs.
  payCheckIp: { capacity: 30, perSeconds: 60 },
  payCheckUser: { capacity: 30, perSeconds: 60 },
  payStartUser: { capacity: 10, perSeconds: 600 },
  payStartOrder: { capacity: 5, perSeconds: 600 },
  // Supplier name checks and the AI bot spend outside quotas.
  lookupIp: { capacity: 20, perSeconds: 60 },
  lookupIpHour: { capacity: 200, perSeconds: 3600 },
  chatIp: { capacity: 12, perSeconds: 60 },
  chatIpDay: { capacity: 150, perSeconds: 86_400 },
  chatOrdersIp: { capacity: 12, perSeconds: 60 },
  // At most one Bakong question per order every 4 s, however many tabs,
  // visitors or Workers poll it, so the Bakong token is never flooded.
  bankCheckOrder: { capacity: 1, perSeconds: 4 },
  // Replaced (older) QRs of an unpaid order: the cron asks every 10 minutes.
  earlierQrCheck: { capacity: 1, perSeconds: 600 },
} satisfies Record<string, Budget>;

export function rule(name: keyof typeof LIMITS, subject: string): Rule {
  return { key: `${name}:${subject}`, ...LIMITS[name] };
}

function expandIpv6(ip: string): string[] | null {
  let text = ip;
  // A dotted IPv4 tail (::ffff:1.2.3.4) becomes its two hex groups.
  const v4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (v4) {
    const b = v4.slice(1).map(Number) as [number, number, number, number];
    if (b.some((x) => x > 255)) return null;
    text = `${text.slice(0, v4.index)}${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const parts = text.split("::");
  if (parts.length > 2) return null;
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const fill = 8 - left.length - right.length;
  if (parts.length === 1 ? fill !== 0 : fill < 1) return null;
  const groups = [...left, ...Array<string>(parts.length === 2 ? fill : 0).fill("0"), ...right];
  return groups.every((g) => /^[0-9a-f]{1,4}$/.test(g)) ? groups : null;
}

/**
 * The limit key for an address. IPv6 users usually get a whole /64 block,
 * so one person can switch between billions of addresses inside it: the
 * block counts as one visitor. IPv4-mapped IPv6 counts as the IPv4 address.
 */
export function ipKey(ip: string): string {
  const raw =
    ip
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .split("%")[0] ?? "";
  if (!raw.includes(":")) {
    const octets = raw.split(".");
    return octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)
      ? octets.map(Number).join(".")
      : "unknown";
  }
  const groups = expandIpv6(raw);
  if (!groups) return "unknown";
  const n = groups.map((g) => parseInt(g, 16));
  if (n.slice(0, 5).every((x) => x === 0) && n[5] === 0xffff) {
    const [hi = 0, lo = 0] = n.slice(6);
    return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
  }
  return `${n
    .slice(0, 4)
    .map((x) => x.toString(16))
    .join(":")}::/64`;
}
