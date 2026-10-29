import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GuestOrderView } from "@/lib/guest-order.server";
import type { PaymentState } from "@/lib/payment.server";

const orderInput = z.object({ orderId: z.string().uuid(), token: z.string().min(16).max(64) });

type LimitName = keyof typeof import("@/lib/rate-limit").LIMITS;

/** Shared (all Workers) limits for this visitor's address. */
async function guestLimit(...names: LimitName[]) {
  const { rule } = await import("@/lib/rate-limit");
  const { clientIp, enforceLimits } = await import("@/lib/rate-limit.server");
  const ip = clientIp();
  await enforceLimits(names.map((name) => rule(name, ip)));
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
    await guestLimit("guestOrderIp");
    const { adminDb } = await import("@/lib/delivery.server");
    const { createGuestOrder } = await import("@/lib/guest-order.server");
    return createGuestOrder(adminDb(), data);
  });

export const getGuestOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<GuestOrderView | null> => {
    await guestLimit("guestView");
    await requireGuestToken(data.orderId, data.token);
    const { adminDb } = await import("@/lib/delivery.server");
    const { loadGuestOrder } = await import("@/lib/guest-order.server");
    return loadGuestOrder(adminDb(), data.orderId);
  });

export const startGuestPayment = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<PaymentState> => {
    await guestLimit("guestPayStartIp");
    await requireGuestToken(data.orderId, data.token);
    const { rule } = await import("@/lib/rate-limit");
    const { enforceLimits } = await import("@/lib/rate-limit.server");
    await enforceLimits([rule("payStartOrder", data.orderId)]);
    const { adminDb } = await import("@/lib/delivery.server");
    const { startOrderPayment } = await import("@/lib/payment.server");
    return startOrderPayment(adminDb(), data.orderId, "guest");
  });

export const checkGuestPayment = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<PaymentState> => {
    // The order page polls every 5 seconds (12 a minute).
    await guestLimit("payCheckIp");
    await requireGuestToken(data.orderId, data.token);
    const { adminDb } = await import("@/lib/delivery.server");
    const { checkOrderPayment } = await import("@/lib/payment.server");
    const { bankCheckAllowed } = await import("@/lib/rate-limit.server");
    return checkOrderPayment(adminDb(), data.orderId, "guest", {
      beforeBankCheck: () => bankCheckAllowed(data.orderId),
    });
  });
