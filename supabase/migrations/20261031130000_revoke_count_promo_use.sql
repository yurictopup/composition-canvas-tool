-- count_promo_use() only runs as the orders trigger; nobody should call it through the API.
revoke execute on function public.count_promo_use() from public, anon, authenticated;
