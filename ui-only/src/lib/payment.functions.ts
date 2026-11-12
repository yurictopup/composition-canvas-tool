import type { PaymentState } from "@/lib/payment.server";
import { demoPayment } from "@/mock/orders";

export async function startPayment({ data }: { data: { orderId: string } }): Promise<PaymentState> {
  return demoPayment(data.orderId);
}

export async function checkPayment({ data }: { data: { orderId: string } }): Promise<PaymentState> {
  return demoPayment(data.orderId);
}
