-- =============================================
-- Yuric Topup: which FazerCards product delivers each package, owner-only.
-- This used to be product_prices.fazer_offer, which anyone could read
-- (product_prices is public so the shop can show prices), so competitors
-- could see the supplier's product names. Step 1 of 2: copy it here.
-- Step 2 (20261028160100_drop_fazer_offer.sql) drops the old column once the
-- code that reads this table is live.
-- =============================================

CREATE TABLE IF NOT EXISTS public.package_offers (
  game_id     text NOT NULL,
  package_amt text NOT NULL,
  fazer_offer text NOT NULL CHECK (length(fazer_offer) BETWEEN 1 AND 200),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, package_amt)
);

ALTER TABLE public.package_offers ENABLE ROW LEVEL SECURITY;

-- Only the verified owner (email + 2FA) reads or edits it; delivery uses the
-- service role, which skips RLS. No policy for anyone else means no access.
DROP POLICY IF EXISTS "owner_all_package_offers" ON public.package_offers;
CREATE POLICY "owner_all_package_offers" ON public.package_offers
  FOR ALL USING ((SELECT public.is_owner())) WITH CHECK ((SELECT public.is_owner()));

REVOKE ALL ON public.package_offers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_offers TO authenticated;

-- Copy the owner's existing picks.
INSERT INTO public.package_offers (game_id, package_amt, fazer_offer)
SELECT game_id, package_amt, fazer_offer
FROM public.product_prices
WHERE fazer_offer IS NOT NULL AND fazer_offer <> ''
ON CONFLICT (game_id, package_amt) DO NOTHING;
