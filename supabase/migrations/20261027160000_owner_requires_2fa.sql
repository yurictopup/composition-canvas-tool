-- =============================================
-- Yuric Topup: the owner account counts as the owner only after its
-- 6-digit authenticator code (Supabase MFA, session level aal2).
-- A stolen password alone (aal1) no longer opens orders, prices, images
-- or customer data, and no longer skips the customer order checks.
-- Lost phone: Supabase dashboard > Authentication > Users > owner >
-- remove the MFA factor, then set up a new one on /admin.
-- =============================================

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'yurictopup@gmail.com'
     AND coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;

-- 1. Owner policies
DROP POLICY IF EXISTS "owner_all" ON public.orders;
CREATE POLICY "owner_all" ON public.orders
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_all_profiles" ON public.profiles;
CREATE POLICY "owner_all_profiles" ON public.profiles
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_all_prices" ON public.product_prices;
CREATE POLICY "owner_all_prices" ON public.product_prices
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_all_supplier_offers" ON public.supplier_offers;
CREATE POLICY "owner_all_supplier_offers" ON public.supplier_offers
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_all_site_images" ON public.site_images;
CREATE POLICY "owner_all_site_images" ON public.site_images
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_insert_site_images" ON storage.objects;
CREATE POLICY "owner_insert_site_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND (SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_update_site_images" ON storage.objects;
CREATE POLICY "owner_update_site_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND (SELECT public.is_owner()));

DROP POLICY IF EXISTS "owner_delete_site_images" ON storage.objects;
CREATE POLICY "owner_delete_site_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND (SELECT public.is_owner()));

-- 2. Order triggers: only the verified owner skips the customer checks.
CREATE OR REPLACE FUNCTION public.clear_order_delivery_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_owner() THEN
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

CREATE OR REPLACE FUNCTION public.enforce_customer_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item public.product_prices%ROWTYPE;
BEGIN
  -- No signed-in user (service role, SQL editor) or the verified owner: leave as is.
  IF auth.uid() IS NULL OR public.is_owner() THEN
    RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.limit_customer_orders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_owner() THEN
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

REVOKE EXECUTE ON FUNCTION public.limit_customer_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_customer_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_order_delivery_fields() FROM PUBLIC, anon, authenticated;
