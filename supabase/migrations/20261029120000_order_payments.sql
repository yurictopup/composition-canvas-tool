-- =============================================
-- Yuric Topup: remember every KHQR an order was given (2026-10-29).
-- orders.payment_md5 only keeps the newest QR. When a customer came back
-- after the QR expired, a new one replaced it and the old md5 was lost, so
-- a payment made with the old QR (a screenshot, an app that ignores the
-- expiry) could never be matched to its order. Every QR is now kept here,
-- and the 2-minute cron also asks Bakong about the older ones.
-- Server only (service role): no policies, so the API can't read it.
-- =============================================

CREATE TABLE IF NOT EXISTS public.order_payments (
  md5        text PRIMARY KEY CHECK (length(md5) BETWEEN 1 AND 128),
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at    timestamptz
);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx
  ON public.order_payments (order_id, created_at DESC);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO service_role;

-- The QRs orders already have.
INSERT INTO public.order_payments (md5, order_id, expires_at, created_at, paid_at)
SELECT payment_md5,
       id,
       payment_expires_at,
       coalesce(payment_expires_at - interval '30 minutes', created_at),
       paid_at
FROM public.orders
WHERE payment_md5 IS NOT NULL
ON CONFLICT (md5) DO NOTHING;
