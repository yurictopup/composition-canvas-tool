export type PromoQuote =
  | { ok: true; code: string; price: number; discount: number; percent: number }
  | { ok: false; message: string };
