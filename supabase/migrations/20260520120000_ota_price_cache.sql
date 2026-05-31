-- Cache kết quả quét OTA theo city + ngày (TTL ngắn, giảm Playwright load)
create table if not exists public.ota_price_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ota_price_cache_expires_at_idx on public.ota_price_cache (expires_at);

comment on table public.ota_price_cache is 'Short-lived Playwright OTA scan results for trip generation';
