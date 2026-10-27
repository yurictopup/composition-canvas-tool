import { isOwner } from "@/lib/games";

/**
 * The owner counts only after the 6-digit authenticator code (Supabase MFA
 * session level "aal2"), so a stolen password alone can't use owner actions.
 */
export function isVerifiedOwner(claims: Record<string, unknown>): boolean {
  const email = typeof claims["email"] === "string" ? claims["email"] : null;
  return isOwner(email) && claims["aal"] === "aal2";
}
