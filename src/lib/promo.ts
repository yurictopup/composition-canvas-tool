// Promo code format, shared by the shop, /admin and the server.
export const PROMO_CODE = /^[A-Z0-9]{3,20}$/;

/** Upper-case code without spaces, or null when it can't be a code. */
export function normalizePromo(input: string | null | undefined): string | null {
  const code = (input ?? "").trim().toUpperCase();
  return PROMO_CODE.test(code) ? code : null;
}
