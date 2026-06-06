-- Marketplace payments / payout / media moderation / AI recommendation rules.
-- Additive only: extends existing `bookings` + `platform_transactions` ledger,
-- adds new tables. Safe to run on existing data (IF NOT EXISTS / DROP+ADD checks).
-- Design: user pays the PLATFORM; platform keeps commission; net is paid out to
-- the business via payout_records. No direct user -> business money flow.

-- ---------------------------------------------------------------------------
-- 1. bookings: marketplace fields + extended status lifecycle
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.business_locations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
  status IN ('suggested', 'draft', 'pending', 'pending_payment', 'paid', 'confirmed', 'cancelled', 'refunded')
);

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. platform_transactions: full marketplace ledger
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS gateway_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS provider_ref TEXT,
  ADD COLUMN IF NOT EXISTS payout_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.platform_transactions DROP CONSTRAINT IF EXISTS platform_transactions_kind_check;
ALTER TABLE public.platform_transactions ADD CONSTRAINT platform_transactions_kind_check CHECK (
  kind IN (
    'booking_commission', 'ad_purchase', 'business_payout',
    'booking_payment', 'commission', 'payout', 'refund', 'adjustment'
  )
);

ALTER TABLE public.platform_transactions DROP CONSTRAINT IF EXISTS platform_transactions_status_check;
ALTER TABLE public.platform_transactions ADD CONSTRAINT platform_transactions_status_check CHECK (
  status IN (
    'pending', 'authorized', 'captured', 'reserved', 'settled',
    'payout_pending', 'paid_out', 'failed', 'refunded', 'cancelled', 'completed'
  )
);

ALTER TABLE public.platform_transactions DROP CONSTRAINT IF EXISTS platform_transactions_source_check;
ALTER TABLE public.platform_transactions ADD CONSTRAINT platform_transactions_source_check CHECK (
  source IN ('booking', 'advertising', 'manual', 'system')
);

DROP TRIGGER IF EXISTS platform_tx_updated_at ON public.platform_transactions;
CREATE TRIGGER platform_tx_updated_at
BEFORE UPDATE ON public.platform_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. payout_records: platform -> business settlement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  payment_transaction_id UUID REFERENCES public.platform_transactions (id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'processing', 'paid', 'failed', 'cancelled')),
  payout_method TEXT,
  provider_ref TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS payout_records_updated_at ON public.payout_records;
CREATE TRIGGER payout_records_updated_at
BEFORE UPDATE ON public.payout_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. business_media: media moderation queue (pending/approved/rejected)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations (id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. ad_packages: benefits/quota payload (business_ad_orders == subscription)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ad_packages
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_ad_orders
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.platform_transactions (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 6. ai_recommendation_rules: admin-managed boost / sponsored visibility
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_recommendation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS ai_reco_rules_updated_at ON public.ai_recommendation_rules;
CREATE TRIGGER ai_reco_rules_updated_at
BEFORE UPDATE ON public.ai_recommendation_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_tx_booking_idx ON public.platform_transactions (booking_id);
CREATE INDEX IF NOT EXISTS platform_tx_status_idx ON public.platform_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_records_business_idx ON public.payout_records (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_records_status_idx ON public.payout_records (status, created_at DESC);
CREATE INDEX IF NOT EXISTS business_media_business_idx ON public.business_media (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS business_media_status_idx ON public.business_media (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_reco_rules_status_idx ON public.ai_recommendation_rules (status);

-- ---------------------------------------------------------------------------
-- RLS (backend uses service role and bypasses these; policies guard direct
-- client access only — clients must go through the API).
-- ---------------------------------------------------------------------------
ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY payout_records_owner_admin_read ON public.payout_records
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY business_media_owner_admin ON public.business_media
  FOR ALL TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY ai_reco_rules_admin ON public.ai_recommendation_rules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
