// Simple per-key request limit (fixed window). It lives in server memory, so
// on Vercel each running instance counts on its own: it stops floods from one
// visitor, not a spread-out attack. The database still caps open orders.
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
  constructor() {
    super("Too many requests. Please wait a minute and try again.");
  }
}

/** Throws when `key` went over its limit. */
export function enforceLimit(key: string, limit: number, windowMs = 60_000) {
  if (!allowRequest(key, limit, windowMs)) throw new TooManyRequestsError();
}
