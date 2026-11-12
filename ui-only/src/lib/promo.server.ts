// UI-only copy: just the type the promo box uses.
export type PromoQuote =
  | { ok: true; code: string; price: number; discount: number; percent: number }
  | { ok: false; message: string };
