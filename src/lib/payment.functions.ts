import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwner } from "@/lib/games";
import type { PaymentState } from "@/lib/payment.server";

const orderInput = z.object({ orderId: z.string().uuid() });

function ownerOrSelf(claims: Record<string, unknown>, userId: string): string | null {
  return isOwner(typeof claims["email"] === "string" ? claims["email"] : null) ? null : userId;
}

// The KHQR the customer scans for their own order.
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<PaymentState> => {
    const { adminDb } = await import("@/lib/delivery.server");
    const { startOrderPayment } = await import("@/lib/payment.server");
    return startOrderPayment(adminDb(), data.orderId, context.userId);
  });

// Polled by the order page; the owner can also run it for any order.
export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<PaymentState> => {
    const { adminDb } = await import("@/lib/delivery.server");
    const { checkOrderPayment } = await import("@/lib/payment.server");
    return checkOrderPayment(adminDb(), data.orderId, ownerOrSelf(context.claims, context.userId));
  });
