-- =============================================
-- Yuric Topup — Security hardening (2026-10-26 review)
-- 1. Customers: Player ID length limits and at most 5 unpaid orders per hour.
-- 2. Trigger functions can't be called through the API.
-- 3. Fixed search_path on the remaining functions.
-- =============================================

-- 1. Limits on customer orders (owner and server inserts are not limited).
CREATE OR REPLACE FUNCTION public.limit_customer_orders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt() ->> 'email', '') = 'yurictopup@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF length(coalesce(NEW.player_id, '')) NOT BETWEEN 1 AND 64
     OR length(coalesce(NEW.player_zone, '')) > 32 THEN
    RAISE EXCEPTION 'Player ID is too long.' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM public.orders
      WHERE user_id = auth.uid()
        AND paid_at IS NULL
        AND status = 'pending'
        AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Too many unpaid orders. Please pay or wait an hour before ordering again.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_limit_customer_orders ON public.orders;
CREATE TRIGGER orders_limit_customer_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.limit_customer_orders();

-- 2. Trigger functions are only for triggers, not the public API.
REVOKE EXECUTE ON FUNCTION public.limit_customer_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_order_delivery_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Fixed search_path (Supabase advisor warning).
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
