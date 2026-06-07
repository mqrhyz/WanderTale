CREATE TABLE IF NOT EXISTS public.promotion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  cover_image_url TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'secondary' CHECK (post_type IN ('main', 'secondary')),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at DATE,
  ends_at DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_saved_vouchers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS promotion_posts_feed_idx
  ON public.promotion_posts (status, sort_order DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS promotion_posts_voucher_idx
  ON public.promotion_posts (voucher_id);

CREATE INDEX IF NOT EXISTS user_saved_vouchers_voucher_idx
  ON public.user_saved_vouchers (voucher_id);

ALTER TABLE public.promotion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotion_posts_read_published ON public.promotion_posts;
CREATE POLICY promotion_posts_read_published ON public.promotion_posts
FOR SELECT TO authenticated
USING (
  status = 'published'
  AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
  AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
);

DROP POLICY IF EXISTS promotion_posts_admin_all ON public.promotion_posts;
CREATE POLICY promotion_posts_admin_all ON public.promotion_posts
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS user_saved_vouchers_own ON public.user_saved_vouchers;
CREATE POLICY user_saved_vouchers_own ON public.user_saved_vouchers
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS promotion_posts_touch_updated_at ON public.promotion_posts;
CREATE TRIGGER promotion_posts_touch_updated_at
BEFORE UPDATE ON public.promotion_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
