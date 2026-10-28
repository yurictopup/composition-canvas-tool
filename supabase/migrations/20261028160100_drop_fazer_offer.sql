-- =============================================
-- Yuric Topup: step 2 of 2. Run only after the code that reads
-- public.package_offers is live (and step 1 was run). Removes the public copy
-- of the FazerCards product names from product_prices.
-- =============================================

-- Safety: stop if a pick was not copied to package_offers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.product_prices p
    WHERE p.fazer_offer IS NOT NULL AND p.fazer_offer <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.package_offers o
        WHERE o.game_id = p.game_id AND o.package_amt = p.package_amt
      )
  ) THEN
    RAISE EXCEPTION 'Some fazer_offer values are not in package_offers yet. Run step 1 first.';
  END IF;
END $$;

ALTER TABLE public.product_prices DROP COLUMN IF EXISTS fazer_offer;
