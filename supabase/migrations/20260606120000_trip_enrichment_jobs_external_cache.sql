-- Durable trip enrichment state + generic external API cache.
-- Safe to run repeatedly on Supabase/Postgres.

create table if not exists public.trip_enrichment_jobs (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_event_type text,
  last_event_payload jsonb,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_enrichment_jobs_status_idx on public.trip_enrichment_jobs(status);
create index if not exists trip_enrichment_jobs_updated_idx on public.trip_enrichment_jobs(updated_at);

comment on table public.trip_enrichment_jobs is 'Durable trip OTA/media enrichment state for Cloud Run-safe retries and SSE snapshots';

create table if not exists public.external_api_cache (
  cache_key text primary key,
  source text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_api_cache_source_idx on public.external_api_cache(source);
create index if not exists external_api_cache_expires_idx on public.external_api_cache(expires_at);

comment on table public.external_api_cache is 'Durable cache for external lookups such as DuckDuckGo images and VietMap search/geocode';
