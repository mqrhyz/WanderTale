-- Business & admin portal (mobile apps)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_business BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended')),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS public.ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_vnd NUMERIC(12, 2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 7,
  boost_level INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_ad_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.ad_packages (id) ON DELETE RESTRICT,
  amount_vnd NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL
    CHECK (kind IN ('booking_commission', 'ad_purchase', 'business_payout')),
  business_id UUID REFERENCES public.businesses (id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings (id) ON DELETE SET NULL,
  ad_order_id UUID REFERENCES public.business_ad_orders (id) ON DELETE SET NULL,
  gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS businesses_owner_idx ON public.businesses (owner_id);
CREATE INDEX IF NOT EXISTS bookings_business_idx ON public.bookings (business_id);
CREATE INDEX IF NOT EXISTS platform_tx_business_idx ON public.platform_transactions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_tx_kind_idx ON public.platform_transactions (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS ad_orders_business_idx ON public.business_ad_orders (business_id, created_at DESC);

CREATE TRIGGER businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ad_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY businesses_owner_read ON public.businesses
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY businesses_admin_write ON public.businesses
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY ad_packages_read ON public.ad_packages
  FOR SELECT TO authenticated
  USING (active = TRUE OR public.is_admin(auth.uid()));

CREATE POLICY ad_packages_admin_write ON public.ad_packages
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY ad_orders_business_read ON public.business_ad_orders
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY ad_orders_business_insert ON public.business_ad_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY platform_tx_business_read ON public.platform_transactions
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY ai_config_admin ON public.ai_platform_config
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed ad packages
INSERT INTO public.ad_packages (name, description, price_vnd, duration_days, boost_level)
VALUES
  ('Gói Basic', 'Đẩy tin cơ bản trên app 7 ngày', 500000, 7, 1),
  ('Gói Pro', 'Ưu tiên hiển thị + badge nổi bật 14 ngày', 1200000, 14, 2),
  ('Gói Premium', 'Top vị trí tìm kiếm + push notification 30 ngày', 2500000, 30, 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_platform_config (key, value)
VALUES
  ('trip_generation', '{"model":"gemini","max_tokens":8192,"enabled":true}'::jsonb),
  ('hotel_agent', '{"model":"gemini","playwright_enabled":true,"enabled":true}'::jsonb),
  ('ota_pricing', '{"enabled":true,"sites":["booking","agoda","vntrip"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
