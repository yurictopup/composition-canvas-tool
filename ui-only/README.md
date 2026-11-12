# Yuric Topup: UI-only copy

This folder is a copy of the Yuric Topup store's look only (pages, components,
styles, fonts, pictures). It has **no backend**: no Supabase, no KHQR/Bakong,
no FazerCards, no admin page, and no keys or secrets. Everything you see uses
demo data that lives in your browser.

## Run it on your computer

You need Node.js 20 or newer (https://nodejs.org, the LTS version).

```bash
cd ui-only
npm install
npm run dev
```

Then open http://localhost:5173 (it opens by itself).

Other commands:

- `npm run build` makes the finished site in `dist/`
- `npm run preview` shows that built site
- `npm run typecheck` checks the TypeScript

## What is fake here

| Feature | In this copy |
| --- | --- |
| Prices and packages | Built-in prices from `src/lib/games.ts` |
| Check ID | Any valid ID shows the name "Demo Player" |
| Promo code | `DEMO10` gives 10% off, others are refused |
| Order + KHQR | A demo order kept in this browser tab; the QR is not a real payment |
| Sign in / sign up | Shows "UI demo: accounts are turned off" |
| Yuric Bot | Built-in keyword answers only (no AI) |

The fake pieces are in `src/integrations/supabase/client.ts`, `src/mock/orders.ts`
and the `src/lib/*.functions.ts` files.

## Design rules (same as the live store)

- No emoji anywhere in the UI; use real icons (lucide-react).
- No Khmer full stop in website text.
- Koulen for headings, Kantumruy Pro for small Khmer text.
- The home banner text is Khmer only; never translate it.
