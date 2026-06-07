-- Sponsored business locations: listed price, city, description + per-location reviews
-- + booking payment mode (prepaid / pay-later).

-- 1. business_locations: giá niêm yết, thành phố, mô tả
ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS price_vnd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

-- 2. bookings: phương thức thanh toán (trả trước / trả sau)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'prepaid'
    CHECK (payment_mode IN ('prepaid', 'pay_later'));

-- 3. location_reviews: đánh giá / bình luận của user cho 1 địa điểm
CREATE TABLE IF NOT EXISTS public.location_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.business_locations (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  rating INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS location_reviews_location_idx
  ON public.location_reviews (location_id, created_at DESC);

ALTER TABLE public.location_reviews ENABLE ROW LEVEL SECURITY;

-- Ai cũng đọc được review (địa điểm công khai).
DROP POLICY IF EXISTS location_reviews_read ON public.location_reviews;
CREATE POLICY location_reviews_read ON public.location_reviews
  FOR SELECT USING (true);

-- User đăng nhập tự tạo review của chính mình.
DROP POLICY IF EXISTS location_reviews_insert_own ON public.location_reviews;
CREATE POLICY location_reviews_insert_own ON public.location_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Trigger cập nhật rating_avg / rating_count trên business_locations
CREATE OR REPLACE FUNCTION public.refresh_location_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc UUID := COALESCE(NEW.location_id, OLD.location_id);
BEGIN
  UPDATE public.business_locations bl
  SET
    rating_count = sub.cnt,
    rating_avg = sub.avg
  FROM (
    SELECT COUNT(*)::int AS cnt, COALESCE(AVG(rating), 0)::numeric(3,2) AS avg
    FROM public.location_reviews
    WHERE location_id = loc
  ) sub
  WHERE bl.id = loc;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS location_reviews_rating ON public.location_reviews;
CREATE TRIGGER location_reviews_rating
AFTER INSERT OR UPDATE OR DELETE ON public.location_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_location_rating();
