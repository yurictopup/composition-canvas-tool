import { describe, expect, it } from "vitest";
import { isVerifiedOwner } from "@/lib/owner";

describe("isVerifiedOwner", () => {
  it("needs the owner email and the 6-digit code level", () => {
    expect(isVerifiedOwner({ email: "yurictopup@gmail.com", aal: "aal2" })).toBe(true);
    expect(isVerifiedOwner({ email: "YuricTopup@gmail.com", aal: "aal2" })).toBe(true);
  });

  it("refuses a password-only owner session", () => {
    expect(isVerifiedOwner({ email: "yurictopup@gmail.com", aal: "aal1" })).toBe(false);
    expect(isVerifiedOwner({ email: "yurictopup@gmail.com" })).toBe(false);
  });

  it("refuses other accounts", () => {
    expect(isVerifiedOwner({ email: "someone@gmail.com", aal: "aal2" })).toBe(false);
    expect(isVerifiedOwner({ aal: "aal2" })).toBe(false);
  });
});
