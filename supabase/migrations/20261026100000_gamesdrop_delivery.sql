-- =============================================
-- Yuric Topup — Automatic delivery through GamesDrop
-- Each package maps to one GamesDrop offer; orders remember the supplier
-- order so delivery can be checked and never bought twice.
-- =============================================

-- 1. Which GamesDrop offer delivers each package (owner-only).
CREATE TABLE IF NOT EXISTS public.supplier_offers (
  game_id            text NOT NULL,
  package_amt        text NOT NULL,
  gamesdrop_offer_id integer NOT NULL CHECK (gamesdrop_offer_id > 0),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, package_amt)
);

ALTER TABLE public.supplier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_supplier_offers" ON public.supplier_offers
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'yurictopup@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

-- 2. Delivery fields on orders, written only by the server.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS player_name       text,
  ADD COLUMN IF NOT EXISTS supplier_order_id text,
  ADD COLUMN IF NOT EXISTS supplier_status   text,
  ADD COLUMN IF NOT EXISTS delivered_at      timestamptz;

-- Customers cannot pre-fill delivery fields when they place an order.
CREATE OR REPLACE FUNCTION public.clear_order_delivery_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND coalesce(auth.jwt() ->> 'email', '') <> 'yurictopup@gmail.com' THEN
    NEW.player_name       := NULL;
    NEW.supplier_order_id := NULL;
    NEW.supplier_status   := NULL;
    NEW.delivered_at      := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_clear_delivery_fields ON public.orders;
CREATE TRIGGER orders_clear_delivery_fields
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.clear_order_delivery_fields();

CREATE UNIQUE INDEX IF NOT EXISTS orders_supplier_order_id_idx
  ON public.orders(supplier_order_id) WHERE supplier_order_id IS NOT NULL;
