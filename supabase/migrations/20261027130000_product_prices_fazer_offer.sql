-- Admin can add packages and pick which FazerCards product delivers each one.
-- Empty means the built-in catalog in src/lib/fazercards-catalog.ts decides.
alter table public.product_prices add column if not exists fazer_offer text;
