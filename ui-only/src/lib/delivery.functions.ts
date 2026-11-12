import type { DeliveryResponse, SupplierOrders, SupplierStock } from "@/lib/delivery.server";
import { demoSupplierOrders } from "@/mock/data";

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function deliverOrder(_input: { data: { orderId: string; allowUnpaid?: boolean; confirmedNotPlaced?: boolean } }): Promise<DeliveryResponse> {
  await wait();
  return { ok: true, message: "Demo: marked as delivered.", status: "COMPLETED" };
}

export async function refreshDelivery(_input: { data: { orderId: string } }): Promise<DeliveryResponse> {
  await wait();
  return { ok: true, message: "Demo: delivery is complete.", status: "COMPLETED" };
}

export async function getSupplierStock(): Promise<SupplierStock> {
  await wait();
  return {
    ok: true,
    balance: 125.4,
    currency: "USD",
    plan: "Demo",
    planExpiresAt: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    subscriptionActive: true,
  };
}

export async function getSupplierOrders(): Promise<SupplierOrders> {
  await wait();
  return { ok: true, orders: demoSupplierOrders() };
}
