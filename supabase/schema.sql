-- WanderTale initial schema: extensions, tables, RLS, storage, realtime

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  travel_styles TEXT[] NOT NULL DEFAULT '{}',
  dietary_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  contact_email TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percent NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  terms_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(12, 2) NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{"tags":[]}'::jsonb,
  travelers INT NOT NULL DEFAULT 1 CHECK (travelers >= 1),
  pace TEXT NOT NULL CHECK (pace IN ('relaxed', 'balanced', 'packed')),
  summary TEXT,
  total_estimated_cost NUMERIC(12, 2),
  risk_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  itinerary_json JSONB,
  embedding vector(1536),
  generation_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (generation_status IN ('generating', 'pricing_pending', 'ready', 'failed')),
  hotel_pricing_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  day_index INT NOT NULL CHECK (day_index >= 1),
  trip_date DATE NOT NULL,
  theme TEXT,
  morning JSONB NOT NULL DEFAULT '{}'::jsonb,
  afternoon JSONB NOT NULL DEFAULT '{}'::jsonb,
  evening JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (trip_id, day_index)
);

CREATE TABLE public.trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES public.trip_days (id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'afternoon', 'evening')),
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  place_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  start_time TIME,
  end_time TIME,
  estimated_cost NUMERIC(12, 2),
  crowdedness_score INT CHECK (
    crowdedness_score IS NULL
    OR (
      crowdedness_score BETWEEN 1
      AND 10
    )
  ),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips (id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (
    type IN ('hotel', 'restaurant', 'ticket', 'transport', 'other')
  ),
  provider TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (
    status IN ('suggested', 'pending', 'confirmed', 'cancelled')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.hotel_agent_threads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'interrupted', 'done', 'error')),
  last_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trips_user_id_idx ON public.trips (user_id);
CREATE INDEX trip_days_trip_id_idx ON public.trip_days (trip_id);
CREATE INDEX trip_activities_day_idx ON public.trip_activities (trip_day_id);
CREATE INDEX weather_snapshots_trip_idx ON public.weather_snapshots (trip_id);
CREATE INDEX bookings_user_idx ON public.bookings (user_id);
CREATE INDEX vouchers_partner_idx ON public.vouchers (partner_id);
CREATE INDEX hotel_agent_threads_user_idx ON public.hotel_agent_threads (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER hotel_agent_threads_updated_at
BEFORE UPDATE ON public.hotel_agent_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      NULLIF(TRIM(EXCLUDED.display_name), ''),
      NULLIF(TRIM(public.profiles.display_name), ''),
      split_part(EXCLUDED.email, '@', 1)
    ),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id
    AND (email IS DISTINCT FROM NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- ---------------------------------------------------------------------------
-- Infra / server-only tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ota_price_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ota_price_cache_expires_at_idx ON public.ota_price_cache (expires_at);

ALTER TABLE public.ota_price_cache ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_agent_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ota_price_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles p WHERE p.id = uid), FALSE);
$$;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_preferences
CREATE POLICY user_prefs_all_own ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- partners: read for authenticated; write admin only
CREATE POLICY partners_read_auth ON public.partners FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY partners_write_admin ON public.partners FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- vouchers: read active for authenticated; write admin
CREATE POLICY vouchers_read_active ON public.vouchers FOR SELECT TO authenticated USING (
  CURRENT_DATE BETWEEN valid_from AND valid_until
);
CREATE POLICY vouchers_read_admin_all ON public.vouchers FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY vouchers_write_admin ON public.vouchers FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- trips tree
CREATE POLICY trips_select_own ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY trips_insert_own ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY trips_update_own ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY trips_delete_own ON public.trips FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY hotel_agent_threads_select_own ON public.hotel_agent_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY hotel_agent_threads_insert_own ON public.hotel_agent_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY hotel_agent_threads_update_own ON public.hotel_agent_threads FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY hotel_agent_threads_delete_own ON public.hotel_agent_threads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY trip_days_select ON public.trip_days FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);
CREATE POLICY trip_days_insert ON public.trip_days FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);
CREATE POLICY trip_days_update ON public.trip_days FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);
CREATE POLICY trip_days_delete ON public.trip_days FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

CREATE POLICY trip_activities_select ON public.trip_activities FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.trip_days d
    JOIN public.trips t ON t.id = d.trip_id
    WHERE d.id = trip_day_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY trip_activities_insert ON public.trip_activities FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trip_days d
    JOIN public.trips t ON t.id = d.trip_id
    WHERE d.id = trip_day_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY trip_activities_update ON public.trip_activities FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.trip_days d
    JOIN public.trips t ON t.id = d.trip_id
    WHERE d.id = trip_day_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY trip_activities_delete ON public.trip_activities FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.trip_days d
    JOIN public.trips t ON t.id = d.trip_id
    WHERE d.id = trip_day_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY weather_snapshots_select ON public.weather_snapshots FOR SELECT USING (
  trip_id IS NULL
  OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);
CREATE POLICY weather_snapshots_insert ON public.weather_snapshots FOR INSERT WITH CHECK (
  trip_id IS NULL
  OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

CREATE POLICY bookings_all_own ON public.bookings FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: enable in Supabase Dashboard (Database > Replication) for `trips`
-- or: ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
-- ---------------------------------------------------------------------------
-- Storage: avatars bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_read ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- Place media + coords cache (no Places API)
-- ---------------------------------------------------------------------------
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
