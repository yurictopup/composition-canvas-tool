# ABA PayWay KHQR: developer handoff

Status (2026-10-28): code ready on branch `claude/project-thread-5lomz5`, unit
tested, **not deployed and not switched on**. The live store still takes
payments through the current Bakong path (ABA Merchant via KHQR.dev). PayWay
Production is waiting for ABA's approval.

The owner (KENZO) must approve before any of these: merging, setting
`PAYMENT_PROVIDER=payway` on the live Worker, or setting `PAYWAY_ENV=production`.

## How payments work

1. The customer places an order (`orders` row, `status = pending`, price set by
   the database trigger, never by the browser).
2. The order page calls `startPayment` / `startGuestPayment`
   (`src/lib/payment.server.ts` → `startOrderPayment`). The **active provider**
   makes a KHQR for that one order and the QR text, its reference and expiry are
   saved on the order (`payment_qr`, `payment_md5`, `payment_expires_at`,
   `payment`).
3. The page asks every 5 s (`checkPayment`), and the Cloudflare cron asks every
   2 min (`src/cron.ts` → `src/lib/order-sweep.server.ts`), so a payment is seen
   even when the customer closed the page.
4. A payment counts only when the provider's **server API** says it is paid and
   the amount equals the order's price (`paymentMatches`). Then `paid_at` is set
   once (`.is("paid_at", null)` guard) and `deliverPaidOrder` buys the package
   from FazerCards (auto top-up). Nothing the browser sends can mark an order paid.

## Provider interface

`src/lib/payment-provider.ts` defines `PaymentProvider`:

| member | meaning |
|---|---|
| `createQr({ orderId, amount })` | new KHQR → `{ qr, ref, expiresAt }` |
| `check(ref)` | `paid` (with amount) / `unpaid` / `unavailable` |
| `expectedAccountId` | account a paid answer must name, or null |
| `sandbox` | true = test money: never mark paid, never deliver |
| `label`, `merchantName` | shown to the customer and in `orders.payment` |

- `activeProvider()` chooses who makes **new** QRs from `PAYMENT_PROVIDER`
  (`bakong` default, `payway`).
- `providerForRef(ref)` chooses who **checks** a stored QR: PayWay references are
  stored as `payway:<tran_id>`, Bakong ones are the QR's md5. So switching
  provider never loses a QR that was already shown to a customer.
- To add another bank later: write `xxx.ts` with create/check functions, add an
  `xxxProvider()` and a ref prefix in `payment-provider.ts`, add tests. No other
  file needs to change.

## ABA PayWay specifics (`src/lib/payway.ts`)

- QR: `POST {base}/api/payment-gateway/v1/payments/generate-qr` (JSON),
  `payment_option = abapay_khqr`, `currency = USD`, `lifetime` minutes
  (default 30), `qr_image_template` (default `template3_color`). The shop uses
  the returned `qrString` and draws the QR itself.
- Check: `POST {base}/api/payment-gateway/v1/payments/check-transaction-2` with
  `req_time`, `merchant_id`, `tran_id`. Paid only when
  `status.code = "00"`, `payment_status_code = 0`, `payment_status = APPROVED`,
  no refund, and the amount matches. `PRE-AUTH`, `PENDING`, `DECLINED`,
  `REFUNDED`, `CANCELLED` and "not found" (code 6) are not paid. Wrong hash,
  HTTP errors and timeouts are `unavailable` (never paid).
- Hash: `base64(HMAC-SHA512(fields joined with no separator, PAYWAY_API_KEY))`,
  field order exactly as in the PayWay docs (see code comments). Computed with
  Web Crypto, verified against Python `hmac` in `src/test/payway.test.ts`.
- `tran_id`: first 8 hex chars of the order id + base36 time, max 20 chars, new
  for every QR (PayWay refuses a reused id with code 403).
- Base URL: Sandbox `https://checkout-sandbox.payway.com.kh`, Production
  `https://checkout.payway.com.kh`. Production is used **only** when
  `PAYWAY_ENV` is exactly `production`.
- Merchant name on the QR comes from the PayWay merchant profile at ABA, not
  from code. Ask ABA to set it to **YURIC SHOP**. `PAYWAY_MERCHANT_NAME` only
  changes the label on the shop's QR card (default `YURIC SHOP`).
- Docs: <https://developer.payway.com.kh/qr-api-14530840e0>,
  <https://developer.payway.com.kh/check-transaction-14530826e0>

## Sandbox safety

With `PAYWAY_ENV` unset or `sandbox`, a confirmed PayWay payment only shows
"Sandbox payment confirmed" to the customer. The order is **not** marked paid,
nothing is bought from FazerCards, and the admin sees the order as unpaid.
Covered by `src/test/payment-provider.test.ts`.

## Environment variables (names only; values go in Cloudflare secrets)

Cloudflare dashboard → Workers → composition-canvas-tool → Settings →
Variables and Secrets. Add each as **Secret**. Never put them in git, in
`VITE_*` variables, or in client code.

| name | needed for | notes |
|---|---|---|
| `PAYMENT_PROVIDER` | switching | `bakong` (default) or `payway` |
| `PAYWAY_MERCHANT_ID` | PayWay | from ABA (Sandbox and Production differ) |
| `PAYWAY_API_KEY` | PayWay | from ABA, signs every request |
| `PAYWAY_ENV` | PayWay | `sandbox` (default) or `production` |
| `PAYWAY_MERCHANT_NAME` | optional | label on the QR card, default `YURIC SHOP` |
| `PAYWAY_QR_LIFETIME_MIN` | optional | 3 or more, default 30 |
| `PAYWAY_QR_TEMPLATE` | optional | default `template3_color` |
| `PAYWAY_API_URL` | optional | override base URL (e.g. a proxy) |
| `BAKONG_TOKEN`, `BAKONG_ACCOUNT_ID`, `BAKONG_MERCHANT_NAME`, `BAKONG_API_URL` | live Bakong path | unchanged |

Adding the `PAYWAY_*` secrets alone changes nothing on the live store: PayWay is
used only when `PAYMENT_PROVIDER=payway`.

No database change is needed: PayWay uses the existing order columns.

## Testing

- Unit tests: `bun run test` (PayWay signing, status mapping, provider choice,
  Sandbox guard, Bakong path unchanged).
- Real Sandbox, from a machine that can reach `checkout-sandbox.payway.com.kh`:

  ```sh
  export PAYWAY_MERCHANT_ID=...   # Sandbox
  export PAYWAY_API_KEY=...       # Sandbox
  bun scripts/payway-sandbox.ts qr 0.01        # prints tran_id and QR text
  bun scripts/payway-sandbox.ts wait <tran_id> # asks every 5 s until paid
  ```

  Pay the Sandbox QR with ABA's Sandbox tools, then `wait` must print
  `"status":"paid"`. If generate-qr answers code 6 or 102, ABA must whitelist the
  calling domain/IP for the merchant.

## Go-live checklist

1. ABA approves PayWay Production; get Production `merchant_id` and API key.
2. ABA sets the merchant display name to **YURIC SHOP** and enables
   `abapay_khqr` for USD on the profile.
3. Ask ABA whether Production calls must come from whitelisted domains/IPs.
   Cloudflare Workers have no fixed IP: whitelist `store.yurictopup.com`, or use a
   fixed-IP proxy through `PAYWAY_API_URL`.
4. Sandbox test passes end to end (script above) with the Sandbox keys.
5. KENZO approves. Merge the PR.
6. Add Production `PAYWAY_MERCHANT_ID`, `PAYWAY_API_KEY`, `PAYWAY_ENV=production`
   as Cloudflare secrets.
7. Set `PAYMENT_PROVIDER=payway`. New orders now get PayWay QRs; old Bakong QRs
   are still checked by Bakong.
8. Make one real small order (e.g. the cheapest MLBB package), pay it, confirm
   it is marked paid and FazerCards delivers.
9. Rollback any time: set `PAYMENT_PROVIDER=bakong` (no code change).

## Not done yet (possible next steps)

- PayWay pushback (`callback_url`): faster than polling, but the cron already
  catches payments within 2 minutes. If added, the callback must only trigger a
  `check-transaction-2` call, never trust the posted body.
- Admin view of PayWay `apv` (approval code). It is saved in `payment_hash` as
  `payway:<tran_id>:<apv>`.
