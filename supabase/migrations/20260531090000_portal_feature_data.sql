-- Admin/business portal feature data. These tables are intentionally empty by
-- default; mobile/web clients must show real data or empty states, not mock rows.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'banned')),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_device TEXT;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS hotline TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS license_no TEXT,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'hidden')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_type TEXT,
  region TEXT,
  season TEXT,
  budget_vnd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  spent_vnd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  suggested_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed', 'free')),
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_discount_vnd NUMERIC(12, 2),
  audience TEXT NOT NULL DEFAULT 'new_user' CHECK (audience IN ('new_user', 'all', 'premium')),
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, code)
);

CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  author_name TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  reply TEXT,
  reported BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('error', 'warning', 'info', 'success')),
  title TEXT NOT NULL,
  source TEXT,
  detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_locations_business_idx ON public.business_locations (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS business_campaigns_business_idx ON public.business_ad_campaigns (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS business_vouchers_business_idx ON public.business_vouchers (business_id, valid_until DESC);
CREATE INDEX IF NOT EXISTS business_reviews_business_idx ON public.business_reviews (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_level_idx ON public.system_logs (level, created_at DESC);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_locations_owner_admin ON public.business_locations
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY business_campaigns_owner_admin ON public.business_ad_campaigns
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY business_vouchers_owner_admin ON public.business_vouchers
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY business_reviews_owner_admin ON public.business_reviews
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY business_reviews_owner_reply ON public.business_reviews
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY system_logs_admin_read ON public.system_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
