import type { PromoQuote } from "@/lib/promo.server";
import { demoPrice } from "@/mock/orders";

export async function checkPromo({
  data,
}: {
  data: { gameId: string; packageAmt: string; code: string };
}): Promise<PromoQuote> {
  await new Promise((r) => setTimeout(r, 300));
  if (data.code.trim().toUpperCase() !== "DEMO10")
    return { ok: false, message: "This promo code is not valid." };
  const price = demoPrice(data.gameId, data.packageAmt);
  const discount = Math.round(price * 10) / 100;
  return { ok: true, code: "DEMO10", price: Math.round((price - discount) * 100) / 100, discount, percent: 10 };
}
