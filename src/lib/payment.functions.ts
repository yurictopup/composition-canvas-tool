import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isVerifiedOwner } from "@/lib/owner";
import type { PaymentState } from "@/lib/payment.server";

const orderInput = z.object({ orderId: z.string().uuid() });

async function ownerOrSelf(
  db: unknown,
  claims: Record<string, unknown>,
  userId: string,
): Promise<string | null> {
  return (await isVerifiedOwner(db, claims)) ? null : userId;
}

// The KHQR the customer scans for their own order.
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<PaymentState> => {
    const { rule } = await import("@/lib/rate-limit");
    const { clientIp, enforceLimits } = await import("@/lib/rate-limit.server");
    await enforceLimits([
      rule("payStartUser", context.userId),
      rule("payStartOrder", data.orderId),
      rule("guestPayStartIp", clientIp()),
    ]);
    const { adminDb } = await import("@/lib/delivery.server");
    const { startOrderPayment } = await import("@/lib/payment.server");
    return startOrderPayment(adminDb(), data.orderId, context.userId);
  });

// Polled by the order page; the owner can also run it for any order.
export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(orderInput)
  .handler(async ({ data, context }): Promise<PaymentState> => {
    // The order page polls every 5 seconds (12 a minute).
    const { rule } = await import("@/lib/rate-limit");
    const { clientIp, enforceLimits } = await import("@/lib/rate-limit.server");
    await enforceLimits([rule("payCheckUser", context.userId), rule("payCheckIp", clientIp())]);
    const { adminDb } = await import("@/lib/delivery.server");
    const { checkOrderPayment } = await import("@/lib/payment.server");
    const { bankCheckAllowed, supplierCheckAllowed } = await import("@/lib/rate-limit.server");
    return checkOrderPayment(
      adminDb(),
      data.orderId,
      await ownerOrSelf(context.supabase, context.claims, context.userId),
      {
        beforeBankCheck: () => bankCheckAllowed(data.orderId),
        beforeSupplierCheck: () => supplierCheckAllowed(data.orderId),
      },
    );
  });
