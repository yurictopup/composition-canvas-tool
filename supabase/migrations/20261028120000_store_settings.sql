-- =============================================
-- Yuric Topup: one switch to stop selling (all games, or some games).
-- The owner flips it on /admin > Prices. While sales are off the shop shows
-- "coming soon" instead of packages, and the database refuses new orders.
-- Orders already paid keep being delivered (the 2-minute cron still runs).
-- Package prices and their own on/off switches are not touched.
-- =============================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id           int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sales_open   boolean NOT NULL DEFAULT true,
  hidden_games text[]  NOT NULL DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Starts with sales OFF (KENZO 2026-10-28: hide all packages until ready).
INSERT INTO public.store_settings (id, sales_open) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_store_settings" ON public.store_settings;
CREATE POLICY "anyone_read_store_settings" ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_all_store_settings" ON public.store_settings;
CREATE POLICY "owner_all_store_settings" ON public.store_settings
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

-- True when the shop sells this game right now.
CREATE OR REPLACE FUNCTION public.sales_open_for(p_game_id text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(
    (SELECT sales_open AND NOT (p_game_id = ANY (hidden_games))
     FROM public.store_settings WHERE id = 1),
    true);
$$;

GRANT EXECUTE ON FUNCTION public.sales_open_for(text) TO anon, authenticated;

-- Signed-in customer orders: same checks as before, plus the sales switch.
CREATE OR REPLACE FUNCTION public.enforce_customer_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item public.product_prices%ROWTYPE;
BEGIN
  -- No signed-in user (service role, SQL editor) or the verified owner: leave as is.
  IF auth.uid() IS NULL OR public.is_owner() THEN
    RETURN NEW;
  END IF;

  IF NOT public.sales_open_for(NEW.game_id) THEN
    RAISE EXCEPTION 'Sales are paused right now. Please come back soon.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO item
  FROM public.product_prices
  WHERE game_id = NEW.game_id AND package_amt = NEW.package_amt AND active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This package is not available for purchase.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.payment IS DISTINCT FROM 'Bakong' THEN
    RAISE EXCEPTION 'Unsupported payment method.'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.id         := gen_random_uuid();
  NEW.user_id    := auth.uid();
  NEW.user_email := coalesce(auth.jwt() ->> 'email', NEW.user_email);
  NEW.game_name  := item.game_name;
  NEW.price_usd  := item.price_usd;
  NEW.status     := 'pending';
  NEW.notes      := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_customer_order() FROM PUBLIC, anon, authenticated;
