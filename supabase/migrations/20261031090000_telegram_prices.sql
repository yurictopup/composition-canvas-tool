-- Telegram Stars / Premium (bought by FazerCards for the buyer's username).
-- FazerCards cost on 2026-10-30: $0.0152 a star; Premium $12.18 / $16.24 / $29.43.
insert into public.product_prices (game_id, package_amt, game_name, price_usd, active) values
  ('tgstars',   '50 Stars',  'Telegram Stars',   0.89, true),
  ('tgstars',   '100 Stars', 'Telegram Stars',   1.75, true),
  ('tgstars',   '250 Stars', 'Telegram Stars',   4.45, true),
  ('tgstars',   '500 Stars', 'Telegram Stars',   8.69, true),
  ('tgstars',   '750 Stars', 'Telegram Stars',  13.39, true),
  ('tgpremium', '3 Months',  'Telegram Premium', 13.89, true),
  ('tgpremium', '6 Months',  'Telegram Premium', 18.49, true),
  ('tgpremium', '12 Months', 'Telegram Premium', 32.99, true)
on conflict (game_id, package_amt) do update
  set game_name = excluded.game_name, price_usd = excluded.price_usd, active = excluded.active;
