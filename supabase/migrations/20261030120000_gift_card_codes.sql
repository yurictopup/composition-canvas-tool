-- Roblox is sold as gift card codes: the paid order buys one code from FazerCards and the
-- buyer sees it on the order page and in My Orders (their own rows only, by RLS).
alter table public.orders add column if not exists delivery_codes text[];

-- Customers can never write a code themselves: cleared on insert like the other delivery fields.
create or replace function public.clear_order_delivery_fields()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    NEW.delivery_codes     := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Game Pass packages replaced by US Robux gift card packages.
update public.product_prices set active = false where game_id = 'roblox';
insert into public.product_prices (game_id, package_amt, game_name, price_usd, active) values
  ('roblox', '50 Robux', 'Roblox', 1.79, true),
  ('roblox', '275 Robux', 'Roblox', 2.99, true),
  ('roblox', '555 Robux', 'Roblox', 5.79, true),
  ('roblox', '1000 Robux', 'Roblox', 9.79, true),
  ('roblox', '2500 Robux', 'Roblox', 24.49, true),
  ('roblox', '5250 Robux', 'Roblox', 49.49, true),
  ('roblox', '11000 Robux', 'Roblox', 99.49, true)
on conflict (game_id, package_amt) do update set price_usd = excluded.price_usd, active = true;
