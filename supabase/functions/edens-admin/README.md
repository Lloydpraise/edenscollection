# edens-admin

The API behind `/admin` (`src/pages/admin/index.astro`, code in `src/admin/`). The store is a static site, so the
admin page has no server of its own: it calls this Supabase edge function in the VVStudios project, which holds the
service role key and only ever touches Edens rows.

- Products: `public.products` where `business_id` is the Edens business. Wholesale is `stock_price`, retail is
  `price`, department is `category`, subcategory is `product_type`. Sold = `discovery_meta.sold_at` (+ `stock_quantity` 0).
- Anything edited in the admin is listed in `discovery_meta.locked`, and the Telegram worker leaves those fields alone.
  "Let the sync update them again" in the editor clears the list.
- Worker settings and run history: `public.edens_sync_config` (one row; its `business_id` decides which business
  Edens is) and `public.edens_sync_runs`. Schema: `supabase/migrations/20261030123500_edens_sync_tables.sql`.
- "Run now" sets `edens_sync_config.run_requested_at`; the worker on the Heysasa server polls for it.

## Setup

1. Supabase dashboard > VVStudios > Edge Functions > Secrets: add `EDENS_ADMIN_PASSWORD`. Changing it later signs
   everyone out.
2. Deploy (already deployed once; redeploy after changes):
   `supabase functions deploy edens-admin --no-verify-jwt --project-ref xgtnbxdxbbywvzrttixf`
   (`--no-verify-jwt` because the function checks its own sign-in token.)
3. The page calls `https://xgtnbxdxbbywvzrttixf.supabase.co/functions/v1/edens-admin` unless
   `PUBLIC_EDENS_ADMIN_API` is set at build time.
