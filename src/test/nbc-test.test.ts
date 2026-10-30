import { describe, expect, it } from "vitest";
import { buildKhqr } from "@/lib/khqr";
import { readKhqr, tokenExpiry } from "@/lib/nbc-test.server";

describe("readKhqr", () => {
  it("reads back the account, name, currency, amount and bill number", () => {
    const qr = buildKhqr({
      accountId: "yuric@bkrt",
      merchantName: "Yuric Store",
      amount: 0.01,
      currency: "USD",
      billNumber: "NBCTEST",
      createdAt: 1,
      expiresAt: 2,
    });
    expect(readKhqr(qr)).toEqual({
      accountId: "yuric@bkrt",
      merchantName: "Yuric Store",
      currency: "USD",
      amount: "0.01",
      billNumber: "NBCTEST",
    });
  });
});

describe("tokenExpiry", () => {
  it("reads exp from a JWT payload", () => {
    const payload = btoa(JSON.stringify({ exp: 1797724800 })).replace(/=+$/, "");
    expect(tokenExpiry(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`)).toBe("2026-12-20T00:00:00.000Z");
  });

  it("gives null for anything else", () => {
    expect(tokenExpiry("not-a-token")).toBeNull();
  });
});
