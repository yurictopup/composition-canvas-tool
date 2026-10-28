import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guestToken, guestTokenValid } from "@/lib/guest-order.server";

const ORDER = "3c82a19d-0000-4000-8000-000000000001";
const OTHER = "3c82a19d-0000-4000-8000-000000000002";

describe("guest order links", () => {
  beforeEach(() => {
    process.env["ORDER_LINK_SECRET"] = "test-secret";
  });
  afterEach(() => {
    delete process.env["ORDER_LINK_SECRET"];
  });

  it("accepts the token made for the order", () => {
    const token = guestToken(ORDER);
    expect(token).toHaveLength(32);
    expect(guestTokenValid(ORDER, token)).toBe(true);
  });

  it("refuses another order's token and made-up tokens", () => {
    expect(guestTokenValid(OTHER, guestToken(ORDER))).toBe(false);
    expect(guestTokenValid(ORDER, "x".repeat(32))).toBe(false);
    expect(guestTokenValid(ORDER, "short")).toBe(false);
  });

  it("changes when the secret changes", () => {
    const before = guestToken(ORDER);
    process.env["ORDER_LINK_SECRET"] = "another-secret";
    expect(guestToken(ORDER)).not.toBe(before);
  });
});
