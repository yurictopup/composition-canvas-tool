import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PromoQuote } from "@/lib/promo.server";

// "Apply" on the game page: the new price with this code, or why it is refused.
export const checkPromo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      gameId: z.string().min(1).max(40),
      packageAmt: z.string().min(1).max(80),
      code: z.string().min(1).max(32),
    }),
  )
  .handler(async ({ data }): Promise<PromoQuote> => {
    const { rule } = await import("@/lib/rate-limit");
    const { clientIp, enforceLimits } = await import("@/lib/rate-limit.server");
    await enforceLimits([rule("promoCheckIp", clientIp())]);
    const { adminDb } = await import("@/lib/delivery.server");
    const { quotePromo } = await import("@/lib/promo.server");
    return quotePromo(adminDb(), data.gameId, data.packageAmt, data.code);
  });
