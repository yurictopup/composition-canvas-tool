-- =============================================
-- Yuric Topup — Secure order creation
-- Customers may only choose what to buy (game, package, player ID).
-- Price, status, email and admin fields are set by the database.
-- =============================================

-- 1. Server-side price list (mirrors src/lib/games.ts).
--    package_amt matches what checkout stores: "<amt> <unit>".
--    Change a price here (or in the Supabase table editor) when it changes in games.ts.
CREATE TABLE IF NOT EXISTS public.product_prices (
  game_id     text NOT NULL,
  package_amt text NOT NULL,
  game_name   text NOT NULL,
  price_usd   numeric(10,2) NOT NULL CHECK (price_usd > 0),
  active      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (game_id, package_amt)
);

ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_prices" ON public.product_prices
  FOR SELECT
  USING (true);

CREATE POLICY "owner_all_prices" ON public.product_prices
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'yurictopup@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

INSERT INTO public.product_prices (game_id, package_amt, game_name, price_usd) VALUES
  ('mlbb', '5 Diamonds', 'Mobile Legends', 0.11),
  ('mlbb', '11 + 1 Diamonds', 'Mobile Legends', 0.22),
  ('mlbb', '22 + 2 Diamonds', 'Mobile Legends', 0.44),
  ('mlbb', '56 + 5 Diamonds', 'Mobile Legends', 1.09),
  ('mlbb', '112 + 10 Diamonds', 'Mobile Legends', 2.19),
  ('mlbb', '223 + 20 Diamonds', 'Mobile Legends', 4.39),
  ('mlbb', '336 + 33 Diamonds', 'Mobile Legends', 6.59),
  ('mlbb', '570 + 66 Diamonds', 'Mobile Legends', 10.99),
  ('mlbb', '1163 + 156 Diamonds', 'Mobile Legends', 21.99),
  ('mlbb', '2398 + 383 Diamonds', 'Mobile Legends', 43.99),
  ('mlbb', '6042 + 1007 Diamonds', 'Mobile Legends', 109.99),
  ('ff', '100 Diamonds', 'Free Fire', 0.99),
  ('ff', '310 Diamonds', 'Free Fire', 2.49),
  ('ff', '520 Diamonds', 'Free Fire', 4.99),
  ('ff', '1080 + 108 Diamonds', 'Free Fire', 8.99),
  ('ff', '2200 + 220 Diamonds', 'Free Fire', 10.99),
  ('ff', '5600 + 560 Diamonds', 'Free Fire', 20.99),
  ('pubg', '60 UC', 'PUBG Mobile', 0.99),
  ('pubg', '325 + 25 UC', 'PUBG Mobile', 4.99),
  ('pubg', '660 + 60 UC', 'PUBG Mobile', 9.99),
  ('pubg', '1800 + 300 UC', 'PUBG Mobile', 24.99),
  ('pubg', '3850 UC', 'PUBG Mobile', 49.99),
  ('pubg', '8100 UC', 'PUBG Mobile', 99.99),
  ('hok', '80 Tokens', 'Honor of Kings', 0.99),
  ('hok', '240 Tokens', 'Honor of Kings', 2.99),
  ('hok', '400 Tokens', 'Honor of Kings', 4.99),
  ('hok', '800 Tokens', 'Honor of Kings', 9.99),
  ('hok', '1200 Tokens', 'Honor of Kings', 14.99),
  ('hok', '2400 Tokens', 'Honor of Kings', 28.99),
  ('hok', '4000 + 180 Tokens', 'Honor of Kings', 49.99),
  ('magicchess', '12 Diamonds', 'Magic Chess GoGo', 0.22),
  ('magicchess', '59 Diamonds', 'Magic Chess GoGo', 0.99),
  ('magicchess', '86 Diamonds', 'Magic Chess GoGo', 1.29),
  ('magicchess', '172 Diamonds', 'Magic Chess GoGo', 2.45),
  ('magicchess', '257 Diamonds', 'Magic Chess GoGo', 3.59),
  ('magicchess', '344 Diamonds', 'Magic Chess GoGo', 4.79),
  ('magicchess', '514 Diamonds', 'Magic Chess GoGo', 7.19),
  ('magicchess', '706 Diamonds', 'Magic Chess GoGo', 9.85),
  ('magicchess', '1050 Diamonds', 'Magic Chess GoGo', 14.79),
  ('magicchess', '2195 Diamonds', 'Magic Chess GoGo', 29.69),
  ('codm', '80 CP', 'Call of Duty: Mobile', 0.99),
  ('codm', '400 + 20 CP', 'Call of Duty: Mobile', 4.99),
  ('codm', '800 + 80 CP', 'Call of Duty: Mobile', 9.99),
  ('codm', '2000 + 400 CP', 'Call of Duty: Mobile', 19.99),
  ('codm', '5000 + 1500 CP', 'Call of Duty: Mobile', 49.99),
  ('codm', '10800 + 2800 CP', 'Call of Duty: Mobile', 99.99),
  ('wildrift', '425 Wild Cores', 'League of Legends: Wild Rift', 4.99),
  ('wildrift', '1000 Wild Cores', 'League of Legends: Wild Rift', 10.99),
  ('wildrift', '1850 Wild Cores', 'League of Legends: Wild Rift', 19.99),
  ('wildrift', '3275 Wild Cores', 'League of Legends: Wild Rift', 34.99),
  ('wildrift', '4800 Wild Cores', 'League of Legends: Wild Rift', 49.99),
  ('wildrift', '10000 Wild Cores', 'League of Legends: Wild Rift', 99.99),
  ('bloodstrike', '56 Gold', 'Blood Strike', 0.49),
  ('bloodstrike', '116 Gold', 'Blood Strike', 0.99),
  ('bloodstrike', '352 Gold', 'Blood Strike', 2.99),
  ('bloodstrike', '594 Gold', 'Blood Strike', 4.99),
  ('bloodstrike', '1210 Gold', 'Blood Strike', 9.99),
  ('bloodstrike', '2486 Gold', 'Blood Strike', 19.99),
  ('bloodstrike', '6380 Gold', 'Blood Strike', 49.99),
  ('coc', '80 Gems', 'Clash of Clans', 1.99),
  ('coc', '500 Gems', 'Clash of Clans', 4.99),
  ('coc', '1200 Gems', 'Clash of Clans', 9.99),
  ('coc', '2500 Gems', 'Clash of Clans', 19.99),
  ('coc', '6500 Gems', 'Clash of Clans', 49.99),
  ('coc', '14000 Gems', 'Clash of Clans', 99.99),
  ('genshin', '60 Genesis Crystals', 'Genshin Impact', 0.99),
  ('genshin', '300 + 30 Genesis Crystals', 'Genshin Impact', 4.99),
  ('genshin', '980 + 110 Genesis Crystals', 'Genshin Impact', 14.99),
  ('genshin', '1980 + 260 Genesis Crystals', 'Genshin Impact', 29.99),
  ('genshin', '3280 + 600 Genesis Crystals', 'Genshin Impact', 49.99),
  ('genshin', '6480 + 1600 Genesis Crystals', 'Genshin Impact', 99.99),
  ('starrail', '60 Oneiric Shards', 'Honkai: Star Rail', 0.99),
  ('starrail', '300 + 30 Oneiric Shards', 'Honkai: Star Rail', 4.99),
  ('starrail', '980 + 110 Oneiric Shards', 'Honkai: Star Rail', 14.99),
  ('starrail', '1980 + 260 Oneiric Shards', 'Honkai: Star Rail', 29.99),
  ('starrail', '3280 + 600 Oneiric Shards', 'Honkai: Star Rail', 49.99),
  ('starrail', '6480 + 1600 Oneiric Shards', 'Honkai: Star Rail', 99.99),
  ('mlbb', 'Weekly Pass Diamonds', 'Mobile Legends', 2.29),
  ('mlbb', 'Weekly Elite Pack Diamonds', 'Mobile Legends', 1.09),
  ('mlbb', 'Weekly + 223💎 Diamonds', 'Mobile Legends', 6.59),
  ('mlbb', 'Twilight Pass Diamonds', 'Mobile Legends', 10.99)

ON CONFLICT (game_id, package_amt) DO UPDATE
  SET game_name = EXCLUDED.game_name, price_usd = EXCLUDED.price_usd, active = true;

-- 2. Rewrite customer orders before insert: price comes from product_prices,
--    status always starts as pending, and admin-only fields are cleared.
CREATE OR REPLACE FUNCTION public.enforce_customer_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item public.product_prices%ROWTYPE;
BEGIN
  -- No signed-in user (service role, SQL editor) or the owner: leave as is.
  -- Anonymous inserts are still blocked by the RLS policy below.
  IF auth.uid() IS NULL
     OR auth.jwt() ->> 'email' = 'yurictopup@gmail.com' THEN
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

DROP TRIGGER IF EXISTS orders_enforce_customer_order ON public.orders;
CREATE TRIGGER orders_enforce_customer_order
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_order();

-- 3. Tighten the insert policy as a second line of defence.
DROP POLICY IF EXISTS "user_insert_order" ON public.orders;
CREATE POLICY "user_insert_order" ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
