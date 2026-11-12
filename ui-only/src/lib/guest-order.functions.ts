// UI-only copy: fake versions of the order calls. The live store runs these
// on the server; here they only keep a demo order in this browser tab.
import type { GuestOrderView } from "@/lib/guest-order.server";
import type { PaymentState } from "@/lib/payment.server";
import { createDemoOrder, demoPayment, loadDemoOrder } from "@/mock/orders";

type OrderInput = { data: { orderId: string; token: string } };

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function placeGuestOrder({
  data,
}: {
  data: {
    gameId: string;
    packageAmt: string;
    playerId: string;
    playerZone?: string | undefined;
    contact?: string | undefined;
    promoCode?: string | undefined;
  };
}): Promise<{ orderId: string; price: number; token: string }> {
  await wait();
  return createDemoOrder(data);
}

export async function getGuestOrder({ data }: OrderInput): Promise<GuestOrderView | null> {
  await wait(200);
  return loadDemoOrder(data.orderId);
}

export async function startGuestPayment({ data }: OrderInput): Promise<PaymentState> {
  await wait();
  return demoPayment(data.orderId);
}

export async function checkGuestPayment({ data }: OrderInput): Promise<PaymentState> {
  return demoPayment(data.orderId);
}
