import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isVerifiedOwner } from "@/lib/owner";
import type { DeliveryResponse, SupplierStock } from "@/lib/delivery.server";

function requireOwner(claims: Record<string, unknown>) {
  if (!isVerifiedOwner(claims)) {
    throw new Error("Only the shop owner can do this (sign in with the 6-digit code).");
  }
}

const orderInput = z.object({ orderId: z.string().uuid() });

// Owner-only: buy this order's package from the supplier now. Orders Bakong has
// not confirmed need allowUnpaid (the owner confirmed they were paid another way);
// orders whose supplier result is UNKNOWN need confirmedNotPlaced (the owner
// checked the FazerCards panel and the order is not there).
export const deliverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    orderInput.extend({
      allowUnpaid: z.boolean().optional(),
      confirmedNotPlaced: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, deliverPaidOrder } = await import("@/lib/delivery.server");
    return deliverPaidOrder(adminDb(), data.orderId, {
      allowUnpaid: data.allowUnpaid === true,
      confirmedNotPlaced: data.confirmedNotPlaced === true,
    });
  });

export const refreshDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<DeliveryResponse> => {
    requireOwner(context.claims);
    const { adminDb, refreshPaidOrder } = await import("@/lib/delivery.server");
    return refreshPaidOrder(adminDb(), data.orderId);
  });

// Owner-only: FazerCards balance and plan for the stock card on /admin.
export const getSupplierStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupplierStock> => {
    requireOwner(context.claims);
    const { supplierStock } = await import("@/lib/delivery.server");
    return supplierStock();
  });
