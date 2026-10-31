// Promo codes: percent off one package, never below the FazerCards cost.
// The price itself is worked out in the database (public.promo_quote), so the
// same rules apply to guest orders (here) and signed-in orders (the insert trigger).
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePromo } from "@/lib/promo";

export type PromoQuote =
  | { ok: true; code: string; price: number; discount: number; percent: number }
  | { ok: false; message: string };

// The database's own reasons; anything else is shown as a plain refusal.
const KNOWN = [
  "This promo code is not valid.",
  "This promo code has expired.",
  "This promo code has been used up.",
  "This promo code does not work on this package.",
  "This package is not available for purchase.",
];

export async function quotePromo(
  db: SupabaseClient,
  gameId: string,
  packageAmt: string,
  input: string,
): Promise<PromoQuote> {
  const code = normalizePromo(input);
  if (!code) return { ok: false, message: "This promo code is not valid." };
  const { data, error } = await db.rpc("promo_quote", {
    p_game_id: gameId,
    p_package_amt: packageAmt,
    p_code: code,
  });
  if (error) {
    const message = KNOWN.find((m) => error.message.includes(m)) ?? "This promo code is not valid.";
    return { ok: false, message };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { price_usd: number | string; discount_usd: number | string; percent_off: number }
    | undefined;
  if (!row) return { ok: false, message: "This promo code is not valid." };
  return {
    ok: true,
    code,
    price: Number(row.price_usd),
    discount: Number(row.discount_usd),
    percent: row.percent_off,
  };
}
