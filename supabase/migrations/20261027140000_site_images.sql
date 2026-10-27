-- Pictures the owner replaces from /admin (banner, game icons, pass and card pictures).
-- The shop reads public.site_images and shows the uploaded file instead of the built-in one.

create table if not exists public.site_images (
  slot       text primary key,
  url        text not null check (url like 'https://%'),
  updated_at timestamptz not null default now()
);

alter table public.site_images enable row level security;

drop policy if exists "anyone_read_site_images" on public.site_images;
create policy "anyone_read_site_images" on public.site_images
  for select using (true);

drop policy if exists "owner_all_site_images" on public.site_images;
create policy "owner_all_site_images" on public.site_images
  for all
  using (auth.jwt() ->> 'email' = 'yurictopup@gmail.com')
  with check (auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

-- Public bucket: anyone can view the files, only the owner can add or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner_insert_site_images" on storage.objects;
create policy "owner_insert_site_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-images' and auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

drop policy if exists "owner_update_site_images" on storage.objects;
create policy "owner_update_site_images" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-images' and auth.jwt() ->> 'email' = 'yurictopup@gmail.com');

drop policy if exists "owner_delete_site_images" on storage.objects;
create policy "owner_delete_site_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-images' and auth.jwt() ->> 'email' = 'yurictopup@gmail.com');
