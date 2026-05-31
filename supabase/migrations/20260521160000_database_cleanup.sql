-- Long-term schema cleanup: profiles as single source of truth, lock down infra tables.

-- ---------------------------------------------------------------------------
-- 1. profiles: drop deprecated / duplicate columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS default_budget,
  DROP COLUMN IF EXISTS default_preferences;

COMMENT ON TABLE public.profiles IS 'User profile (1:1 auth.users). Source of truth for display_name, email copy, phone.';
COMMENT ON COLUMN public.profiles.email IS 'Copy of auth.users.email at signup; synced on auth email change.';
COMMENT ON COLUMN public.profiles.phone IS 'User-editable contact phone; nullable until saved in app.';

-- ---------------------------------------------------------------------------
-- 2. Signup + email sync triggers (idempotent)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- Backfill any missing profile rows / empty emails
INSERT INTO public.profiles (id, display_name, email)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1)),
  u.email
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles AS p
SET
  email = COALESCE(NULLIF(TRIM(p.email), ''), u.email),
  display_name = COALESCE(
    NULLIF(TRIM(p.display_name), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'display_name'), ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users AS u
WHERE p.id = u.id;

-- ---------------------------------------------------------------------------
-- 3. Infra tables: RLS on, no client policies (service_role / backend only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ota_price_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ota_price_cache_expires_at_idx ON public.ota_price_cache (expires_at);

ALTER TABLE public.ota_price_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ota_price_cache IS 'Server-only OTA scan cache. RLS enabled; no client policies.';

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'checkpoint%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'COMMENT ON TABLE public.%I IS %L',
      tbl,
      'LangGraph checkpoint storage. RLS enabled; backend service_role only.'
    );
  END LOOP;
END $$;
