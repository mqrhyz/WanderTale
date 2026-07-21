-- Track last change of non-hotline business profile fields (type/region/name/etc).
-- Hotline may update anytime; other core fields are limited to once every 30 days.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS core_profile_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.core_profile_changed_at IS
  'Last time core profile fields (not hotline) were changed; used for 30-day edit lock.';
