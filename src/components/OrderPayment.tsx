import { useEffect, useState, type ReactNode } from "react";
import { KhqrCode } from "@/components/KhqrCode";
import { checkPayment, startPayment } from "@/lib/payment.functions";
import type { PaymentState } from "@/lib/payment.server";

const POLL_MS = 5000;

// Shows the order's own KHQR and waits for Bakong to confirm it. Without
// Bakong set up on the server, the manual instructions (fallback) are shown.
export function OrderPayment({ orderId, fallback }: { orderId: string; fallback: ReactNode }) {
  const [state, setState] = useState<PaymentState | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    startPayment({ data: { orderId } })
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const waiting = !!state?.available && !!state.qr && !state.paid;
  const expired = waiting && !!state.expiresAt && new Date(state.expiresAt).getTime() < now;

  useEffect(() => {
    if (!waiting || expired) return;
    const timer = setInterval(async () => {
      setNow(Date.now());
      try {
        const next = await checkPayment({ data: { orderId } });
        if (next.paid) setState(next);
      } catch {
        // keep polling; a missed check is retried on the next tick
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, expired, orderId]);

  if (error || (state && !state.available)) return <>{fallback}</>;

  if (!state) {
    return (
      <div className="mb-6 rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
        Preparing KHQR…
      </div>
    );
  }

  if (state.paid) {
    const done = state.status === "completed";
    return (
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
        <p className="text-base font-bold">✅ បានទទួលការបង់ប្រាក់</p>
        <p className="mt-1">
          {done ? "ពេជ្រត្រូវបានបញ្ចូលរួចហើយ ✨" : "កំពុងបញ្ចូលពេជ្រទៅគណនីរបស់អ្នក… (1-5 នាទី)"}
        </p>
      </div>
    );
  }

  if (!state.qr) {
    return (
      <div className="mb-6 rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
        {state.message ?? "KHQR is not available for this order."}
      </div>
    );
  }

  const minutesLeft = state.expiresAt
    ? Math.max(0, Math.ceil((new Date(state.expiresAt).getTime() - now) / 60000))
    : null;

  return (
    <div className="mb-6 rounded-2xl bg-muted/50 p-5">
      <h2 className="mb-1 text-base font-bold">💳 Scan to pay with Bakong</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Amount: <strong className="text-base text-accent">${state.amount?.toFixed(2)}</strong>
      </p>
      <div className="flex justify-center">
        {expired ? (
          <p className="py-10 text-sm text-destructive">
            KHQR ផុតកំណត់ហើយ។ សូម refresh ទំព័រ ដើម្បីបាន QR ថ្មី។
          </p>
        ) : (
          <KhqrCode value={state.qr} />
        )}
      </div>
      {!expired && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          ស្កេនដោយកម្មវិធីធនាគារណាមួយ។ ពេលបង់រួច ទំព័រនេះនឹងដឹងដោយស្វ័យប្រវត្តិ
          {minutesLeft !== null ? ` · ${minutesLeft} នាទីទៀត` : ""}
        </p>
      )}
    </div>
  );
}
