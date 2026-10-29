import { describe, expect, it } from "vitest";
import { allowRequest } from "@/lib/rate-limit";

describe("allowRequest", () => {
  it("allows up to the limit, then blocks until the window ends", () => {
    const key = `test-${Math.random()}`;
    expect(allowRequest(key, 2, 1000, 0)).toBe(true);
    expect(allowRequest(key, 2, 1000, 10)).toBe(true);
    expect(allowRequest(key, 2, 1000, 20)).toBe(false);
    expect(allowRequest(key, 2, 1000, 1000)).toBe(true);
  });

  it("counts each key on its own", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(allowRequest(a, 1, 1000, 0)).toBe(true);
    expect(allowRequest(a, 1, 1000, 1)).toBe(false);
    expect(allowRequest(b, 1, 1000, 1)).toBe(true);
  });
});

import { ipKey, LIMITS, rule, TooManyRequestsError } from "@/lib/rate-limit";
import { bankCheckAllowed, checkLimits, enforceLimits, type Take } from "@/lib/rate-limit.server";

describe("ipKey", () => {
  it("keeps IPv4 addresses and refuses junk", () => {
    expect(ipKey("203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(ipKey("999.1.1.1")).toBe("unknown");
    expect(ipKey("")).toBe("unknown");
    expect(ipKey("not-an-ip")).toBe("unknown");
  });

  it("groups IPv6 addresses by their /64 block", () => {
    const a = ipKey("2001:db8:abcd:12:1111:2222:3333:4444");
    const b = ipKey("2001:0db8:abcd:0012::9");
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(b).toBe(a);
    expect(ipKey("2001:db8:abcd:13::1")).not.toBe(a);
    expect(ipKey("[2001:db8::1]")).toBe("2001:db8:0:0::/64");
    expect(ipKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(ipKey("1:2:3")).toBe("unknown");
    expect(ipKey("1::2::3")).toBe("unknown");
  });

  it("treats IPv4-mapped IPv6 as the IPv4 address", () => {
    expect(ipKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("::ffff:cb00:7107")).toBe("203.0.113.7");
  });
});

/** A shared bucket like the database one, kept in a map. */
function fakeBucket() {
  const state = new Map<string, { tokens: number; at: number }>();
  let clock = 0;
  const take: Take = async (r) => {
    const s = state.get(r.key) ?? { tokens: r.capacity, at: clock };
    const avail = Math.min(
      r.capacity,
      s.tokens + ((clock - s.at) / 1000) * (r.capacity / r.perSeconds),
    );
    const allowed = avail >= 1;
    state.set(r.key, { tokens: allowed ? avail - 1 : avail, at: clock });
    return {
      allowed,
      retryAfterMs: allowed ? 0 : Math.ceil(((1 - avail) / (r.capacity / r.perSeconds)) * 1000),
    };
  };
  return { take, tick: (ms: number) => (clock += ms) };
}

describe("checkLimits (shared bucket)", () => {
  it("stops a visitor even when every request lands on a different Worker", async () => {
    const bucket = fakeBucket();
    const ip = `198.51.100.${Math.floor(Math.random() * 250)}`;
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      // A fresh key per call skips the memory layer, like a new Worker copy would.
      const r = { ...rule("guestOrderIp", ip) };
      const res = await checkLimits([{ ...r, key: r.key }], bucket.take, i * 1_000_000_000);
      results.push(res.allowed);
    }
    expect(results.filter(Boolean)).toHaveLength(LIMITS.guestOrderIp.capacity);
  });

  it("refills over time and says how long to wait", async () => {
    const bucket = fakeBucket();
    const r = { key: `t-${Math.random()}`, capacity: 2, perSeconds: 10 };
    let t = 0;
    const far = () => (t += 1e9); // a new memory window each time: only the shared bucket counts
    expect((await checkLimits([r], bucket.take, far())).allowed).toBe(true);
    expect((await checkLimits([r], bucket.take, far())).allowed).toBe(true);
    const denied = await checkLimits([r], bucket.take, far());
    expect(denied).toEqual({ allowed: false, retryAfterSeconds: 5 });
    bucket.tick(5_000);
    expect((await checkLimits([r], bucket.take, far())).allowed).toBe(true);
  });

  it("turns a flood on one Worker away before asking the database", async () => {
    let calls = 0;
    const take: Take = async () => {
      calls++;
      return { allowed: true, retryAfterMs: 0 };
    };
    const r = { key: `mem-${Math.random()}`, capacity: 3, perSeconds: 60 };
    for (let i = 0; i < 10; i++) await checkLimits([r], take, 1000);
    expect(calls).toBe(3);
  });

  it("falls back to the memory limit when the database fails", async () => {
    const take: Take = async () => {
      throw new Error("db down");
    };
    const r = { key: `down-${Math.random()}`, capacity: 2, perSeconds: 60 };
    const errors = console.error;
    console.error = () => {};
    try {
      expect((await checkLimits([r], take, 5)).allowed).toBe(true);
      expect((await checkLimits([r], take, 6)).allowed).toBe(true);
      expect((await checkLimits([r], take, 7)).allowed).toBe(false);
    } finally {
      console.error = errors;
    }
  });

  it("enforceLimits throws TooManyRequestsError", async () => {
    const take: Take = async () => ({ allowed: false, retryAfterMs: 120_000 });
    const r = { key: `deny-${Math.random()}`, capacity: 5, perSeconds: 60 };
    await expect(enforceLimits([r], take)).rejects.toBeInstanceOf(TooManyRequestsError);
    await expect(enforceLimits([{ ...r, key: `${r.key}2` }], take)).rejects.toThrow("2 minutes");
  });

  it("asks Bakong about one order at most once per few seconds", async () => {
    const bucket = fakeBucket();
    const order = `order-${Math.random()}`;
    expect(await bankCheckAllowed(order, bucket.take)).toBe(true);
    expect(await bankCheckAllowed(order, bucket.take)).toBe(false);
    expect(await bankCheckAllowed(`${order}-other`, bucket.take)).toBe(true);
  });
});
