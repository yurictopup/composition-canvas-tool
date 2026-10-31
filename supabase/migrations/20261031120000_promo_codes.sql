-- Promo codes (percent off, total use limit, expiry) and a cost floor so a
-- discount never makes an order cheaper than its FazerCards cost.

-- 1. Supplier cost next to each price (FazerCards snapshot 2026-10-27; the
--    owner can correct it). Packages without a cost get no discount.
alter table public.product_prices add column if not exists cost_usd numeric(10, 4);

update public.product_prices p
set cost_usd = c.cost
from (values
('mlbb', '11 Diamonds', 0.24),
('mlbb', '12 Diamonds', 0.214),
('mlbb', '14 Diamonds', 0.23),
('mlbb', '19 Diamonds', 0.337),
('mlbb', '22 Diamonds', 0.49),
('mlbb', '28 Diamonds', 0.49),
('mlbb', '42 Diamonds', 0.69),
('mlbb', '86 Diamonds', 1.142),
('mlbb', '112 Diamonds', 2),
('mlbb', '172 Diamonds', 2.254),
('mlbb', '257 Diamonds', 3.233),
('mlbb', '284 Diamonds', 4.59),
('mlbb', '296 Diamonds', 4.916),
('mlbb', '429 Diamonds', 5.488),
('mlbb', '570 Diamonds', 8.9),
('mlbb', '706 Diamonds', 8.864),
('mlbb', '716 Diamonds', 11.48),
('mlbb', '1084 Diamonds', 16.93),
('mlbb', '1163 Diamonds', 19.08),
('mlbb', '1446 Diamonds', 22.9),
('mlbb', '2195 Diamonds', 26.836),
('mlbb', '2398 Diamonds', 33.74),
('mlbb', '2976 Diamonds', 45.92),
('mlbb', '3688 Diamonds', 44.758),
('mlbb', '5532 Diamonds', 67.585),
('mlbb', '7502 Diamonds', 114.6),
('mlbb', '9288 Diamonds', 112.261),
('mlbb', 'Weekly Pass Diamonds', 1.397),
('mlbb', 'Weekly Elite Pack Diamonds', 0.745),
('mlbb', 'Monthly Elite Pack Diamonds', 3.641),
('mlbb', 'Twilight Pass Diamonds', 7.436),
('mlbb', 'First Top-Up 50 + 5 Diamonds', 0.714),
('mlbb', 'First Top-Up 150 + 15 Diamonds', 2.152),
('mlbb', 'First Top-Up 250 + 25 Diamonds', 3.458),
('mlbb', 'First Top-Up 500 + 65 Diamonds', 7.109),
('ff', '25 Diamonds', 0.23),
('ff', '100 Diamonds', 0.89),
('ff', '310 Diamonds', 2.72),
('ff', '520 Diamonds', 4.54),
('ff', '1060 Diamonds', 8.93),
('ff', '2180 Diamonds', 18.04),
('ff', '5600 Diamonds', 44.66),
('ff', '11500 Diamonds', 92),
('ff', 'Weekly Lite Diamonds', 0.32),
('ff', 'Weekly Card Diamonds', 1.54),
('ff', 'Monthly Card Diamonds', 7.68),
('ff', 'Level Up Pack Lv6 Diamonds', 0.286),
('ff', 'Level Up Pack Lv10 Diamonds', 0.612),
('ff', 'Level Up Pack Lv15 Diamonds', 0.612),
('ff', 'Level Up Pack Lv20 Diamonds', 0.612),
('ff', 'Level Up Pack Lv25 Diamonds', 0.612),
('ff', 'Level Up Pack Lv30 Diamonds', 0.908),
('magicchess', '5 Diamonds', 0.09),
('magicchess', '11 Diamonds', 0.1642),
('magicchess', '12 Diamonds', 0.19),
('magicchess', '19 Diamonds', 0.29),
('magicchess', '22 Diamonds', 0.3307),
('magicchess', '28 Diamonds', 0.43),
('magicchess', '44 Diamonds', 0.68),
('magicchess', '56 Diamonds', 0.8258),
('magicchess', '59 Diamonds', 0.9),
('magicchess', '86 Diamonds', 1.163),
('magicchess', '112 Diamonds', 1.6198),
('magicchess', '165 Diamonds', 2.234),
('magicchess', '172 Diamonds', 2.315),
('magicchess', '223 Diamonds', 3.2395),
('magicchess', '257 Diamonds', 3.468),
('magicchess', '275 Diamonds', 3.713),
('magicchess', '296 Diamonds', 4.4),
('magicchess', '344 Diamonds', 4.641),
('magicchess', '408 Diamonds', 6.26),
('magicchess', '516 Diamonds', 6.956),
('magicchess', '565 Diamonds', 7.426),
('magicchess', '570 Diamonds', 8.268),
('magicchess', '706 Diamonds', 9.282),
('magicchess', '875 Diamonds', 13.17),
('magicchess', '1060 Diamonds', 14.107),
('magicchess', '1163 Diamonds', 16.5256),
('magicchess', '1346 Diamonds', 17.401),
('magicchess', '1825 Diamonds', 23.195),
('magicchess', '2195 Diamonds', 27.836),
('magicchess', '2398 Diamonds', 32.4248),
('magicchess', '3688 Diamonds', 46.4),
('magicchess', '4830 Diamonds', 68.33),
('magicchess', '5532 Diamonds', 69.595),
('magicchess', '6042 Diamonds', 81.0451),
('magicchess', '9288 Diamonds', 115.984),
('magicchess', 'Weekly Card Diamonds', 1.7462),
('magicchess', 'First Recharge 50 + 50 Diamonds', 0.8517),
('magicchess', 'First Recharge 150 + 150 Diamonds', 2.36),
('magicchess', 'First Recharge 250 + 250 Diamonds', 3.93),
('magicchess', 'First Recharge 500 + 500 Diamonds', 8.6653),
('magicchess', 'Battle for Discounts Diamonds', 0.745),
('magicchess', 'Lukas''s Battle Bounty Diamonds', 0.745),
('pubg', '60 UC', 0.8798),
('pubg', '300 + 25 UC', 4.39),
('pubg', '600 + 60 UC', 8.79),
('pubg', '1500 + 300 UC', 21.97),
('pubg', '3000 + 850 UC', 43.94),
('pubg', '6000 + 2100 UC', 87.87),
('pubg', 'First Purchase Pack UC', 0.88),
('pubg', 'Weekly Deal Pack 1 UC', 0.861),
('pubg', 'Weekly Deal Pack 2 UC', 2.573),
('pubg', 'Upgradable Firearm Materials Pack UC', 2.573),
('pubg', 'Weekly Mythic Emblem Pack UC', 2.573),
('pubg', 'Mythic Emblem Pack UC', 4.295),
('pubg', 'Prime 1 Month UC', 0.88),
('pubg', 'Prime 3 Months UC', 2.64),
('pubg', 'Prime 6 Months UC', 5.28),
('pubg', 'Prime 12 Months UC', 10.56),
('pubg', 'Prime Plus 1 Month UC', 8.8),
('pubg', 'Prime Plus 3 Months UC', 26.4),
('pubg', 'Prime Plus 6 Months UC', 52),
('pubg', 'Prime Plus 12 Months UC', 105),
('pubg', 'Elite Pass LV1-50 UC', 5.3),
('pubg', 'Elite Pass LV1-100 UC', 10.692),
('pubg', 'Elite Pass Plus LV1-100 UC', 25.245),
('hok', '16 Tokens', 0.17),
('hok', '80 Tokens', 0.84),
('hok', '240 Tokens', 2.51),
('hok', '400 Tokens', 4.19),
('hok', '560 Tokens', 5.87),
('hok', '830 Tokens', 8.38),
('hok', '1245 Tokens', 12.57),
('hok', '2508 Tokens', 25.15),
('hok', '4180 Tokens', 41.92),
('hok', '8360 Tokens', 83.84),
('hok', 'Weekly Card Tokens', 0.94),
('hok', 'Weekly Card Plus Tokens', 2.86),
('hok', 'Double Token Lucky Bag Tokens', 0.32),
('hok', 'Honor Point Value Pack Tokens', 0.32),
('hok', 'Standard Purchase Rebate Pack Tokens', 0.32),
('hok', 'Premium Purchase Rebate Pack Tokens', 1.17),
('wildrift', '425 Wild Cores', 4.64),
('wildrift', '1000 Wild Cores', 10.22),
('wildrift', '1850 Wild Cores', 18.58),
('wildrift', '3275 Wild Cores', 32.52),
('wildrift', '4800 Wild Cores', 46.46),
('wildrift', '10000 Wild Cores', 92.92),
('bloodstrike', '51 Gold', 0.388),
('bloodstrike', '105 Gold', 0.755),
('bloodstrike', '320 Gold', 2.305),
('bloodstrike', '540 Gold', 3.845),
('bloodstrike', '1100 Gold', 7.711),
('bloodstrike', '2260 Gold', 15.433),
('bloodstrike', '5800 Gold', 38.658),
('bloodstrike', 'Season Pass Gold', 0.765),
('bloodstrike', 'Level Up Pass Gold', 1.54),
('bloodstrike', 'Strike Pass Elite Gold', 3.07),
('bloodstrike', 'Strike Pass Premium Gold', 6.93),
('bloodstrike', 'Ultra Skin Lucky Chest Gold', 0.388),
('bloodstrike', 'Lucky Bag Week Gold', 0.765),
('bloodstrike', '$0.49 Deal Gold', 0.388),
('bloodstrike', '$0.99 Deal Gold', 0.765),
('bloodstrike', '$1.99 Deal Gold', 1.54),
('bloodstrike', '$2.99 Deal Gold', 2.315),
('bloodstrike', '$3.99 Deal Gold', 3.091),
('bloodstrike', '$4.99 Deal Gold', 3.866),
('bloodstrike', '$5.99 Deal Gold', 4.58),
('bloodstrike', '$6.99 Deal Gold', 5.355),
('bloodstrike', '$7.99 Deal Gold', 6.13),
('bloodstrike', '$8.99 Deal Gold', 6.977),
('bloodstrike', '$9.99 Deal Gold', 7.742),
('genshin', '60 Genesis Crystals', 0.9999),
('genshin', '300 + 30 Genesis Crystals', 4.9793),
('genshin', '980 + 110 Genesis Crystals', 14.9177),
('genshin', '1980 + 260 Genesis Crystals', 29.8253),
('genshin', '3280 + 600 Genesis Crystals', 49.7122),
('genshin', '6480 + 1600 Genesis Crystals', 99.4042),
('genshin', 'Blessing of the Welkin Moon Genesis Crystals', 4.9793),
('starrail', '60 Oneiric Shards', 0.88),
('starrail', '300 + 30 Oneiric Shards', 4.29),
('starrail', '980 + 110 Oneiric Shards', 13.54),
('starrail', '1980 + 260 Oneiric Shards', 25.98),
('starrail', '3280 + 600 Oneiric Shards', 43.33),
('starrail', '6480 + 1600 Oneiric Shards', 86.07),
('starrail', 'Express Supply Pass Oneiric Shards', 4.29),
('valorant', '475 VP', 4.64),
('valorant', '1000 VP', 9.29),
('valorant', '2050 VP', 18.58),
('valorant', '3650 VP', 32.52),
('valorant', '5350 VP', 46.46),
('valorant', '11000 VP', 92.92),
('deltaforce', '18 Delta Coins', 0.22),
('deltaforce', '30 Delta Coins', 0.37),
('deltaforce', '60 Delta Coins', 0.75),
('deltaforce', '320 Delta Coins', 3.77),
('deltaforce', '460 Delta Coins', 5.46),
('deltaforce', '750 Delta Coins', 7.53),
('deltaforce', '1480 Delta Coins', 15.07),
('deltaforce', '1980 Delta Coins', 18.84),
('deltaforce', '3950 Delta Coins', 37.68),
('deltaforce', '8100 Delta Coins', 75.36),
('deltaforce', '16200 Delta Coins', 156.692),
('deltaforce', '24300 Delta Coins', 235.028),
('deltaforce', 'Season Pass Operations Special Delta Coins', 4.243),
('deltaforce', 'Season Pass Warfare Special Delta Coins', 4.243),
('deltaforce', 'Season Pass Deluxe Delta Coins', 5.875),
('arenabreakout', '66 Bonds', 0.775),
('arenabreakout', '335 Bonds', 3.93),
('arenabreakout', '675 Bonds', 7.74),
('arenabreakout', '1690 Bonds', 19.57),
('arenabreakout', '3400 Bonds', 39.19),
('arenabreakout', '6820 Bonds', 78.26),
('arenabreakout', 'Beginner Select Bonds', 0.714),
('arenabreakout', 'Monthly Advanced Battle Pass Bonds', 0.857),
('arenabreakout', 'Bulletproof Case Privileges Bonds', 2.13),
('arenabreakout', 'Bulletproof Case 30 Days Bonds', 2.152),
('arenabreakout', 'Monthly Premium Battle Pass Bonds', 3.458),
('arenabreakout', 'Composite Case Privileges Bonds', 6.41),
('arenabreakout', 'Composite Case 30 Days Bonds', 6.497),
('arenabreakout', 'Quarterly Premium Battle Pass Bundle Bonds', 10.414),
('zzz', '60 Monochrome', 0.9651),
('zzz', '300 + 30 Monochrome', 4.8677),
('zzz', '980 + 110 Monochrome', 14.6455),
('zzz', '1980 + 260 Monochrome', 29.3016),
('zzz', '3280 + 600 Monochrome', 48.8466),
('zzz', '6480 + 1600 Monochrome', 97.7039),
('zzz', 'Inter-Knot Membership Monochrome', 4.8677),
('eafc', '40 FC Points', 0.377),
('eafc', '100 FC Points', 0.959),
('eafc', '520 FC Points', 4.835),
('eafc', '1070 FC Points', 9.67),
('eafc', '2200 FC Points', 19.36),
('eafc', '5750 FC Points', 48.409),
('eafc', '12000 FC Points', 96.829),
('eafc', '39 Silver FC Points', 0.377),
('eafc', '99 Silver FC Points', 0.959),
('eafc', '499 Silver FC Points', 4.835),
('eafc', '999 Silver FC Points', 9.67),
('eafc', '1999 Silver FC Points', 19.36),
('eafc', '4999 Silver FC Points', 48.409),
('eafc', '9999 Silver FC Points', 96.829),
('lol', '575 RP', 4.64),
('lol', '1380 RP', 10.22),
('lol', '2800 RP', 20.44),
('lol', '4500 RP', 32.52),
('lol', '6500 RP', 46.46),
('lol', '13500 RP', 92.92),
('hi3', '65 Crystals', 0.98),
('hi3', '330 Crystals', 4.96),
('hi3', '660 Crystals', 9.93),
('hi3', '1320 Crystals', 19.88),
('hi3', '3300 Crystals', 49.7),
('hi3', '6600 Crystals', 99.42),
('hi3', 'Monthly Card Crystals', 4.96),
('hi3', '65 B-Chips Crystals', 0.98),
('hi3', '330 B-Chips Crystals', 4.96),
('hi3', '990 B-Chips Crystals', 15.36),
('hi3', '1320 B-Chips Crystals', 19.88),
('hi3', '1980 B-Chips Crystals', 29.82),
('hi3', '3300 B-Chips Crystals', 49.7),
('hi3', '6600 B-Chips Crystals', 99.42),
('mlbb_ph', '11 Diamonds', 0.18),
('mlbb_ph', '22 Diamonds', 0.34),
('mlbb_ph', '56 Diamonds', 0.83),
('mlbb_ph', '112 Diamonds', 1.64),
('mlbb_ph', '223 Diamonds', 3.27),
('mlbb_ph', '336 Diamonds', 4.92),
('mlbb_ph', '570 Diamonds', 8.21),
('mlbb_ph', '1163 Diamonds', 16.39),
('mlbb_ph', '2398 Diamonds', 32.77),
('mlbb_ph', '6042 Diamonds', 81.92),
('mlbb_ph', 'Weekly Pass Diamonds', 1.73),
('mlbb_ph', 'Twilight Pass Diamonds', 8.28),
('mlbb_ph', 'First Top-Up 50 + 5 Diamonds', 0.83),
('mlbb_ph', 'First Top-Up 150 + 15 Diamonds', 2.44),
('mlbb_ph', 'First Top-Up 250 + 25 Diamonds', 4.04),
('mlbb_ph', 'First Top-Up 500 + 65 Diamonds', 8.18),
('mlbb_my', '14 Diamonds', 0.23),
('mlbb_my', '42 Diamonds', 0.69),
('mlbb_my', '70 Diamonds', 1.15),
('mlbb_my', '140 Diamonds', 2.29),
('mlbb_my', '284 Diamonds', 4.59),
('mlbb_my', '355 Diamonds', 5.74),
('mlbb_my', '429 Diamonds', 6.89),
('mlbb_my', '716 Diamonds', 11.48),
('mlbb_my', '1084 Diamonds', 17.19),
('mlbb_my', '1446 Diamonds', 21.9),
('mlbb_my', '2976 Diamonds', 45.46),
('mlbb_my', '7502 Diamonds', 112.43),
('mlbb_my', 'Weekly Pass Diamonds', 1.91),
('mlbb_my', 'Weekly Elite Pack Diamonds', 0.9),
('mlbb_my', 'Monthly Elite Pack Diamonds', 4.46),
('mlbb_my', 'Twilight Pass Diamonds', 8.42),
('mlbb_my', 'First Top-Up 50 + 5 Diamonds', 0.9),
('mlbb_my', 'First Top-Up 150 + 15 Diamonds', 2.68),
('mlbb_my', 'First Top-Up 250 + 25 Diamonds', 4.46),
('mlbb_my', 'First Top-Up 500 + 65 Diamonds', 9.07),
('ff_sg', '25 Diamonds', 0.245),
('ff_sg', '100 Diamonds', 0.938),
('ff_sg', '310 Diamonds', 2.825),
('ff_sg', '520 Diamonds', 4.712),
('ff_sg', '1060 Diamonds', 9.435),
('ff_sg', '2180 Diamonds', 18.87),
('ff_sg', '5600 Diamonds', 47.155),
('ff_sg', '11500 Diamonds', 94.309),
('ff_sg', 'Weekly Lite Diamonds', 0.265),
('ff_sg', 'Weekly Card Diamonds', 1.601),
('ff_sg', 'Monthly Card Diamonds', 7.517),
('ff_sg', 'Level Up Pack Lv6 Diamonds', 0.306),
('ff_sg', 'Level Up Pack Lv10 Diamonds', 0.643),
('ff_sg', 'Level Up Pack Lv15 Diamonds', 0.643),
('ff_sg', 'Level Up Pack Lv20 Diamonds', 0.643),
('ff_sg', 'Level Up Pack Lv25 Diamonds', 0.643),
('ff_sg', 'Level Up Pack Lv30 Diamonds', 0.938),
('ff_ph', '20 Diamonds', 0.19),
('ff_ph', '40 Diamonds', 0.38),
('ff_ph', '100 Diamonds', 0.95),
('ff_ph', '205 Diamonds', 1.9),
('ff_ph', '420 Diamonds', 3.79),
('ff_ph', '650 Diamonds', 6.12),
('ff_ph', '1100 Diamonds', 10.2),
('ff_ph', '2250 Diamonds', 20.41),
('ff_vn', '25 Diamonds', 0.194),
('ff_vn', '51 Diamonds', 0.388),
('ff_vn', '113 Diamonds', 0.74),
('ff_vn', '283 Diamonds', 1.85),
('ff_vn', '566 Diamonds', 3.7),
('ff_vn', '1132 Diamonds', 7.41),
('ff_vn', '2830 Diamonds', 18.51),
('ff_vn', 'Weekly Lite Diamonds', 0.459),
('ff_vn', 'Weekly Card Diamonds', 1.938),
('ff_vn', 'Monthly Card Diamonds', 8.507),
('ff_id', '5 Diamonds', 0.05),
('ff_id', '12 Diamonds', 0.1),
('ff_id', '50 Diamonds', 0.38),
('ff_id', '70 Diamonds', 0.47),
('ff_id', '140 Diamonds', 0.98),
('ff_id', '355 Diamonds', 2.36),
('ff_id', '720 Diamonds', 4.73),
('ff_id', '1450 Diamonds', 9.45),
('ff_id', '2180 Diamonds', 14.18),
('ff_id', '3640 Diamonds', 23.63),
('ff_id', '7290 Diamonds', 47.35),
('ff_id', 'Weekly Card Diamonds', 1.42),
('ff_id', 'Monthly Card Diamonds', 4.27),
('ff_id', 'BP Card Diamonds', 2.3),
('ff_id', 'Level Up Pack Lv6 Diamonds', 0.28),
('ff_id', 'Level Up Pack Lv10 Diamonds', 0.46),
('ff_id', 'Level Up Pack Lv15 Diamonds', 0.46),
('ff_id', 'Level Up Pack Lv20 Diamonds', 0.46),
('ff_id', 'Level Up Pack Lv25 Diamonds', 0.46),
('ff_id', 'Level Up Pack Lv30 Diamonds', 0.74)

) as c(game_id, package_amt, cost)
where p.game_id = c.game_id and p.package_amt = c.package_amt;

-- 2. The codes. Only the owner can see or change them; customers check a code
--    through promo_quote().
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  percent_off integer not null check (percent_off between 1 and 50),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
create policy "owner reads promo codes" on public.promo_codes
  for select to authenticated using (public.is_owner());
create policy "owner adds promo codes" on public.promo_codes
  for insert to authenticated with check (public.is_owner());
create policy "owner changes promo codes" on public.promo_codes
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner removes promo codes" on public.promo_codes
  for delete to authenticated using (public.is_owner());

-- 3. Which code an order used and how much it saved.
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount_usd numeric(10, 2);

-- 4. The price of one package with a code. Errors explain why a code is refused.
--    The discounted price never goes below cost + 2 cents.
create or replace function public.promo_quote(p_game_id text, p_package_amt text, p_code text)
returns table (price_usd numeric, discount_usd numeric, percent_off integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item public.product_prices%rowtype;
  promo public.promo_codes%rowtype;
  floor_price numeric;
  new_price numeric;
begin
  select * into item from public.product_prices
  where game_id = p_game_id and package_amt = p_package_amt and active;
  if not found then
    raise exception 'This package is not available for purchase.' using errcode = 'check_violation';
  end if;

  select * into promo from public.promo_codes where code = upper(trim(p_code));
  if not found or not promo.active then
    raise exception 'This promo code is not valid.' using errcode = 'check_violation';
  end if;
  if promo.expires_at is not null and promo.expires_at < now() then
    raise exception 'This promo code has expired.' using errcode = 'check_violation';
  end if;
  if promo.max_uses is not null and promo.used_count >= promo.max_uses then
    raise exception 'This promo code has been used up.' using errcode = 'check_violation';
  end if;
  if item.cost_usd is null then
    raise exception 'This promo code does not work on this package.' using errcode = 'check_violation';
  end if;

  floor_price := ceil((item.cost_usd + 0.02) * 100) / 100;
  new_price := greatest(round(item.price_usd * (100 - promo.percent_off) / 100.0, 2), floor_price);
  if new_price >= item.price_usd then
    raise exception 'This promo code does not work on this package.' using errcode = 'check_violation';
  end if;

  price_usd := new_price;
  discount_usd := item.price_usd - new_price;
  percent_off := promo.percent_off;
  return next;
end;
$$;
revoke all on function public.promo_quote(text, text, text) from public, anon, authenticated;
grant execute on function public.promo_quote(text, text, text) to service_role;

-- 5. Signed-in orders: the existing price check also applies the code.
create or replace function public.enforce_customer_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item public.product_prices%rowtype;
  quote record;
begin
  -- No signed-in user (service role, SQL editor) or the verified owner: leave as is.
  if auth.uid() is null or public.is_owner() then
    return new;
  end if;

  if not public.sales_open_for(new.game_id) then
    raise exception 'Sales are paused right now. Please come back soon.'
      using errcode = 'check_violation';
  end if;

  select * into item
  from public.product_prices
  where game_id = new.game_id and package_amt = new.package_amt and active;

  if not found then
    raise exception 'This package is not available for purchase.'
      using errcode = 'check_violation';
  end if;

  if new.payment is distinct from 'Bakong' then
    raise exception 'Unsupported payment method.'
      using errcode = 'check_violation';
  end if;

  new.id         := gen_random_uuid();
  new.user_id    := auth.uid();
  new.user_email := coalesce(auth.jwt() ->> 'email', new.user_email);
  new.game_name  := item.game_name;
  new.price_usd  := item.price_usd;
  new.discount_usd := null;
  if nullif(trim(coalesce(new.promo_code, '')), '') is not null then
    select * into quote from public.promo_quote(new.game_id, new.package_amt, new.promo_code);
    new.promo_code   := upper(trim(new.promo_code));
    new.price_usd    := quote.price_usd;
    new.discount_usd := quote.discount_usd;
  else
    new.promo_code := null;
  end if;
  new.status     := 'pending';
  new.notes      := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

-- 6. A use counts when the order is paid, so unpaid orders don't burn uses.
create or replace function public.count_promo_use()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.promo_code is not null and old.paid_at is null and new.paid_at is not null then
    update public.promo_codes set used_count = used_count + 1 where code = new.promo_code;
  end if;
  return new;
end;
$$;
drop trigger if exists count_promo_use on public.orders;
create trigger count_promo_use after update of paid_at on public.orders
  for each row execute function public.count_promo_use();
