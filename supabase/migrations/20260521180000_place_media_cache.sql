-- Cache ảnh địa điểm + tọa độ (Nominatim) — không dùng Places API

CREATE TABLE IF NOT EXISTS public.place_image_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    TEXT UNIQUE NOT NULL,
  urls         TEXT[] NOT NULL,
  source       TEXT NOT NULL,
  category     TEXT,
  hit_count    INTEGER NOT NULL DEFAULT 0,
  cached_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS place_image_cache_key_idx ON public.place_image_cache (cache_key);
CREATE INDEX IF NOT EXISTS place_image_cache_expires_idx ON public.place_image_cache (expires_at);

CREATE TABLE IF NOT EXISTS public.place_coords_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    TEXT UNIQUE NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  display_name TEXT,
  cached_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS place_coords_cache_key_idx ON public.place_coords_cache (cache_key);
CREATE INDEX IF NOT EXISTS place_coords_cache_expires_idx ON public.place_coords_cache (expires_at);
