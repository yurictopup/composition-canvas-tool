// PayWay Sandbox check, run by a developer (never deployed):
//   PAYWAY_MERCHANT_ID=... PAYWAY_API_KEY=... bun scripts/payway-sandbox.ts qr 0.01
//   PAYWAY_MERCHANT_ID=... PAYWAY_API_KEY=... bun scripts/payway-sandbox.ts check <tran_id>
//   ... bun scripts/payway-sandbox.ts wait <tran_id>   (asks every 5 s for 10 min)
// Uses the same code as the shop (src/lib/payway.ts). Refuses Production keys.
import { checkPaywayTransaction, createPaywayQr, type PaywayConfig } from "../src/lib/payway";

const [cmd, arg] = process.argv.slice(2);
const merchantId = process.env["PAYWAY_MERCHANT_ID"];
const apiKey = process.env["PAYWAY_API_KEY"];
if (!merchantId || !apiKey) {
  console.error("Set PAYWAY_MERCHANT_ID and PAYWAY_API_KEY (Sandbox) first.");
  process.exit(1);
}
if (process.env["PAYWAY_ENV"] === "production") {
  console.error("This script only talks to PayWay Sandbox.");
  process.exit(1);
}
const cfg: PaywayConfig = { env: "sandbox", merchantId, apiKey, merchantName: "YURIC SHOP" };

if (cmd === "qr") {
  const amount = Number(arg ?? "0.01");
  const qr = await createPaywayQr(cfg, { orderId: crypto.randomUUID(), amount });
  console.log(JSON.stringify({ tranId: qr.tranId, amount, expiresAt: new Date(qr.expiresAt) }));
  console.log(qr.qr);
} else if ((cmd === "check" || cmd === "wait") && arg) {
  const until = Date.now() + (cmd === "wait" ? 10 * 60_000 : 0);
  for (;;) {
    const res = await checkPaywayTransaction(cfg, arg);
    console.log(new Date().toISOString(), JSON.stringify(res));
    if (res.status === "paid" || Date.now() >= until) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
} else {
  console.error("Usage: qr [amount] | check <tran_id> | wait <tran_id>");
  process.exit(1);
}
