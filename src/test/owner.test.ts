import { describe, expect, it, vi } from "vitest";
import { isOwnerAccount, isVerifiedOwner } from "@/lib/owner";

/** A user client whose database answers `answer` to every function call. */
function userDb(answer: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => answer) };
}

describe("isVerifiedOwner", () => {
  it("asks the database (owner user id), with the 6-digit code level", async () => {
    const db = userDb({ data: true, error: null });
    expect(await isVerifiedOwner(db, { email: "anyone@example.com", aal: "aal2" })).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("is_owner");
  });

  it("refuses a password-only session without asking", async () => {
    const db = userDb({ data: true, error: null });
    expect(await isVerifiedOwner(db, { email: "yurictopup@gmail.com", aal: "aal1" })).toBe(false);
    expect(await isVerifiedOwner(db, { email: "yurictopup@gmail.com" })).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("does not trust the email in the token", async () => {
    const db = userDb({ data: false, error: null });
    expect(await isVerifiedOwner(db, { email: "yurictopup@gmail.com", aal: "aal2" })).toBe(false);
  });

  it("counts a database error as not the owner", async () => {
    const db = userDb({ data: null, error: { message: "function does not exist" } });
    expect(await isVerifiedOwner(db, { aal: "aal2" })).toBe(false);
    expect(await isOwnerAccount(db)).toBe(false);
  });
});
