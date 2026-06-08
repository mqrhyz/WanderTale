ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN NOT NULL DEFAULT TRUE;
