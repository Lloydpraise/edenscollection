-- Edens Watches: Telegram worker config and run log. Products themselves live in public.products
-- (business_id = the Edens business). Only the service role touches these tables (worker and the
-- edens-admin edge function), so RLS is on with no policies.

create table if not exists public.edens_sync_config (
  business_id text primary key,
  channel text,
  enabled boolean not null default true,
  markup_kes integer not null default 2000,
  schedule text not null default '0 3 * * *',
  sold_keywords text[] not null default '{sold}',
  runner text not null default 'server',
  edge_function text,
  last_message_id bigint,
  run_requested_at timestamptz,
  run_request_mode text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.edens_sync_runs (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  trigger text not null default 'cron',
  runner text,
  posts_scanned integer not null default 0,
  created integer not null default 0,
  updated integer not null default 0,
  sold_marked integer not null default 0,
  removed integer not null default 0,
  needs_review integer not null default 0,
  errors jsonb not null default '[]',
  log text
);

create index if not exists edens_sync_runs_business_started on public.edens_sync_runs (business_id, started_at desc);

alter table public.edens_sync_config enable row level security;
alter table public.edens_sync_runs enable row level security;
