# Composition Canvas Tool

តើអ្នកអាច bliund អោយដូច web នេះ បានទេ https://lovable.dev/preview/eORNaZqoxtPcsbZQTunTtLKXgQuKe80h

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://composition-canvas-tool.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8c353f4-e428-4aa6-896d-00e107462df6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Player name check (GamesDrop)

Check ID looks up the in-game name through the [GamesDrop partner API](https://gamesdrop.io/en/docs/partner-api), from the server only. Set these secrets in Lovable Cloud:

- `GAMESDROP_API_TOKEN`: the Shop API token from the GamesDrop merchant dashboard.
- `GAMESDROP_OFFER_IDS`: JSON mapping game ids to GamesDrop offer ids (`offerGroupId` from `/api/v1/offers/sync`), e.g. `{"mlbb":1001,"ff":2002}`.

Games missing from `GAMESDROP_OFFER_IDS` keep saying the lookup is not available, and buying stays disabled for them. Offer `999` is GamesDrop's test offer (the docs say its validation always answers VALID), so `{"mlbb":999}` can be used to try the connection before real offers are mapped.

## Automatic delivery (GamesDrop)

Each package can be linked to a GamesDrop offer in **/admin → Prices** (use "Search GamesDrop" to find offer IDs). Paid orders for linked packages get a **🚀 Deliver** button in **/admin → Orders**, which buys the package from your GamesDrop balance and tops up the player. The order id is sent as GamesDrop's `transactionId`, so the same order is never bought twice. Linked offers also turn on the name check, so `GAMESDROP_OFFER_IDS` is optional. Run `supabase/migrations/20261026100000_gamesdrop_delivery.sql` after the secure-order migration.

## Bakong KHQR payment

After placing an order, the customer sees a KHQR for the exact amount. The page checks Bakong every 5 seconds; once the payment matches (same amount, USD, your account), the order is marked paid and GamesDrop delivery starts automatically. The owner can also press **💳 Check payment** in **/admin → Orders**. Without these secrets the old manual payment instructions are shown. Set them as server environment variables:

- `BAKONG_TOKEN`: an NBC Bakong Open API token (`eyJ…`, renew every 90 days) or a KHQR.dev token (`rbk…`).
- `BAKONG_ACCOUNT_ID`: the Bakong account that receives payments, e.g. `name@bank`.
- `BAKONG_MERCHANT_NAME` (optional): name shown in the banking app, default `Yuric Topup`.
- `BAKONG_API_URL` (optional): the NBC API only answers Cambodian IP addresses, so with an NBC token point this at a proxy hosted in Cambodia. KHQR.dev tokens work from anywhere.

Run `supabase/migrations/20261026120000_bakong_payment.sql` after the GamesDrop delivery migration.
