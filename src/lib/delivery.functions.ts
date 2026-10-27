import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwner } from "@/lib/games";
import type { DeliveryResponse } from "@/lib/delivery.server";

function requireOwner(claims: Record<string, unknown>) {
  if (!isOwner(typeof claims["email"] === "string" ? claims["email"] : null)) {
    throw new Error("Only the shop owner can do this.");
  }
}

const orderInput = z.object({ orderId: z.string().uuid() });

// Owner-only: buy this order's package from the supplier now. Orders Bakong has
// not confirmed need allowUnpaid (the owner confirmed they were paid another way).
export const deliverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput.extend({ allowUnpaid: z.boolean().optional() }))
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, deliverPaidOrder } = await import("@/lib/delivery.server");
    return deliverPaidOrder(adminDb(), data.orderId, { allowUnpaid: data.allowUnpaid === true });
  });

export const refreshDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, refreshPaidOrder } = await import("@/lib/delivery.server");
    return refreshPaidOrder(adminDb(), data.orderId);
  });
