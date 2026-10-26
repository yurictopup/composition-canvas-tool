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
