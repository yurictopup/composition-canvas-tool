-- =============================================
-- Yuric Topup — Bakong KHQR payment check
-- Each order gets its own KHQR; once Bakong confirms it, paid_at is set and
-- the order is delivered through GamesDrop.
-- =============================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_qr         text,
  ADD COLUMN IF NOT EXISTS payment_md5        text,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_hash       text,
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_md5_idx
  ON public.orders(payment_md5) WHERE payment_md5 IS NOT NULL;

-- Customers cannot pre-fill payment or delivery fields when they place an order.
CREATE OR REPLACE FUNCTION public.clear_order_delivery_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND coalesce(auth.jwt() ->> 'email', '') <> 'yurictopup@gmail.com' THEN
    NEW.player_name        := NULL;
    NEW.supplier_order_id  := NULL;
    NEW.supplier_status    := NULL;
    NEW.delivered_at       := NULL;
    NEW.payment_qr         := NULL;
    NEW.payment_md5        := NULL;
    NEW.payment_expires_at := NULL;
    NEW.payment_hash       := NULL;
    NEW.paid_at            := NULL;
  END IF;
  RETURN NEW;
END;
$$;
