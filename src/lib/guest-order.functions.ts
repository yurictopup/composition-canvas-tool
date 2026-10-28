import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GuestOrderView } from "@/lib/guest-order.server";
import type { PaymentState } from "@/lib/payment.server";

const orderInput = z.object({ orderId: z.string().uuid(), token: z.string().min(16).max(64) });

async function guestLimit(name: string, limit: number) {
  const { enforceLimit } = await import("@/lib/rate-limit");
  const { clientIp } = await import("@/lib/rate-limit.server");
  enforceLimit(`${name}:${clientIp()}`, limit);
}

/** Throws unless the token is the one the server gave out for this order. */
async function requireGuestToken(orderId: string, token: string) {
  const { guestTokenValid } = await import("@/lib/guest-order.server");
  if (!guestTokenValid(orderId, token)) throw new Error("Order not found.");
}

// Place an order without signing in. Price and game name come from the database.
export const placeGuestOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      gameId: z.string().min(1).max(40),
      packageAmt: z.string().min(1).max(80),
      playerId: z.string().min(1).max(64),
      playerZone: z.string().max(32).optional(),
      contact: z.string().max(64).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ orderId: string; price: number; token: string }> => {
    await guestLimit("guest-order", 5);
    const { adminDb } = await import("@/lib/delivery.server");
    const { createGuestOrder } = await import("@/lib/guest-order.server");
    return createGuestOrder(adminDb(), data);
  });

export const getGuestOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<GuestOrderView | null> => {
    await guestLimit("guest-view", 30);
    await requireGuestToken(data.orderId, data.token);
    const { adminDb } = await import("@/lib/delivery.server");
    const { loadGuestOrder } = await import("@/lib/guest-order.server");
    return loadGuestOrder(adminDb(), data.orderId);
  });

export const startGuestPayment = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<PaymentState> => {
    await guestLimit("guest-pay-start", 10);
    await requireGuestToken(data.orderId, data.token);
    const { adminDb } = await import("@/lib/delivery.server");
    const { startOrderPayment } = await import("@/lib/payment.server");
    return startOrderPayment(adminDb(), data.orderId, "guest");
  });

export const checkGuestPayment = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<PaymentState> => {
    // The order page polls every 5 seconds (12 a minute).
    await guestLimit("guest-pay-check", 30);
    await requireGuestToken(data.orderId, data.token);
    const { adminDb } = await import("@/lib/delivery.server");
    const { checkOrderPayment } = await import("@/lib/payment.server");
    return checkOrderPayment(adminDb(), data.orderId, "guest");
  });
