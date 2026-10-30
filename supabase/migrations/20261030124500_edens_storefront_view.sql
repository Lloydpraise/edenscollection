-- Public read access for the Edens storefront build.
--
-- The products table only allows signed-in business owners to read, so the static site (which builds with
-- the anon key) reads this view instead. It exposes approved, visible Edens products only, and leaves out
-- stock_price (wholesale), embeddings and anything else internal. The Edens business is whichever one the
-- single edens_sync_config row points at.

create or replace view public.edens_storefront_products as
select
  p.id,
  p.telegram_id,
  p.title,
  p.price,
  p.old_price,
  p.stock_quantity,
  p.images,
  p.category,
  p.product_type,
  p.description_short,
  p.description_long,
  p.key_features,
  p.handle,
  p.discovered_at,
  p.discovery_meta ->> 'brand' as brand,
  coalesce((p.discovery_meta ->> 'brand_found')::boolean, false) as brand_found,
  p.discovery_meta ->> 'audience' as audience,
  p.discovery_meta -> 'specs' as specs,
  p.discovery_meta ->> 'sold_at' as sold_at
from public.products p
join public.edens_sync_config c on c.business_id = p.business_id
where p.status = 'approved'
  and p.is_visible
  and p.price is not null;

revoke all on public.edens_storefront_products from public, anon, authenticated;
grant select on public.edens_storefront_products to anon, authenticated;
