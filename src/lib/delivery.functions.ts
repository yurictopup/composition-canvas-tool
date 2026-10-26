import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwner } from "@/lib/games";
import type { CatalogOffer } from "@/lib/delivery";
import type { DeliveryResponse } from "@/lib/delivery.server";

function requireOwner(claims: Record<string, unknown>) {
  if (!isOwner(typeof claims["email"] === "string" ? claims["email"] : null)) {
    throw new Error("Only the shop owner can do this.");
  }
}

const orderInput = z.object({ orderId: z.string().uuid() });

// Owner-only: buy this paid order's package from GamesDrop now.
export const deliverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, deliverPaidOrder } = await import("@/lib/delivery.server");
    return deliverPaidOrder(adminDb(), data.orderId);
  });

export const refreshDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, refreshPaidOrder } = await import("@/lib/delivery.server");
    return refreshPaidOrder(adminDb(), data.orderId);
  });

export const findGamesDropOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ search: z.string().trim().min(2).max(60) }))
  .handler(async ({ data, context }): Promise<CatalogOffer[]> => {
    requireOwner(context.claims);
    const { searchGamesDropCatalog } = await import("@/lib/delivery");
    const { gamesDropToken } = await import("@/lib/delivery.server");
    return searchGamesDropCatalog(data.search, { token: gamesDropToken() });
  });
