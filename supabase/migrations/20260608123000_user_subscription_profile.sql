ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_subscription_idx
  ON public.profiles (subscription_tier, subscription_expires_at);
