import type { SupabaseClient } from "@supabase/supabase-js";

// The owner is one account, checked by its user id in the database
// (public.is_owner / private.store_owner), never by the email in the token.

/** Calls a yes/no database function as the signed-in user; errors count as no. */
async function ask(db: unknown, fn: "is_owner" | "is_owner_account"): Promise<boolean> {
  const { data, error } = await (db as SupabaseClient).rpc(fn);
  return !error && data === true;
}

/**
 * The owner counts only after the 6-digit authenticator code (Supabase MFA
 * session level "aal2"), so a stolen password alone can't use owner actions.
 * `db` must be a client signed in as the user (not the service role).
 */
export async function isVerifiedOwner(
  db: unknown,
  claims: Record<string, unknown>,
): Promise<boolean> {
  if (claims["aal"] !== "aal2") return false;
  return ask(db, "is_owner");
}

/** The owner account, before or after the code. Only for showing owner screens. */
export function isOwnerAccount(db: unknown): Promise<boolean> {
  return ask(db, "is_owner_account");
}
