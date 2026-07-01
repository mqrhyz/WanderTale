-- Pool địa điểm crawled (nhà hàng/quán ăn/cafe) để AI itinerary dùng làm nguồn gợi ý
-- cho user đặt lịch du lịch tại Việt Nam. Dữ liệu này serve cùng với Google Places.

CREATE TABLE IF NOT EXISTS public.place_places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,                          -- 'foody' | 'pasgo' | 'riviu'
  source_id       TEXT NOT NULL,                          -- id tại nguồn (string cho an toàn)
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL,                          -- "TP. HCM" | "Hà Nội" | "Lâm Đồng" ...
  city_slug       TEXT,                                   -- "ho-chi-minh" | "ha-noi" | "lam-dong"
  district        TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  categories      TEXT[] NOT NULL DEFAULT '{}',           -- ["Nhà hàng", "Café/Dessert", ...]
  cuisines        TEXT[] NOT NULL DEFAULT '{}',           -- ["Món Nhật", "Món Việt", ...]
  image           TEXT NOT NULL,                          -- ảnh chính (full URL)
  image_urls      TEXT[] NOT NULL DEFAULT '{}',           -- album nếu có (hiện chỉ 1)
  rating          NUMERIC(4,2),
  total_review    INTEGER,
  detail_url      TEXT,
  raw             JSONB NOT NULL DEFAULT '{}'::jsonb,     -- payload gốc để re-process sau
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Không trùng (source, source_id)
CREATE UNIQUE INDEX IF NOT EXISTS place_places_source_source_id_uniq
  ON public.place_places (source, source_id);

-- Lookup chính: AI itinerary sẽ filter theo (city, category)
CREATE INDEX IF NOT EXISTS place_places_city_idx
  ON public.place_places (city);
CREATE INDEX IF NOT EXISTS place_places_city_district_idx
  ON public.place_places (city, district);
CREATE INDEX IF NOT EXISTS place_places_categories_gin
  ON public.place_places USING GIN (categories);
CREATE INDEX IF NOT EXISTS place_places_cuisines_gin
  ON public.place_places USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS place_places_latlng_idx
  ON public.place_places (lat, lng);

ALTER TABLE public.place_places ENABLE ROW LEVEL SECURITY;

-- Đọc public cho mọi user (để mobile + web + AI service query được).
DROP POLICY IF EXISTS place_places_read_public ON public.place_places;
CREATE POLICY place_places_read_public ON public.place_places
  FOR SELECT USING (true);

-- Chỉ service_role / admin mới ghi (ADMIN write).
DROP POLICY IF EXISTS place_places_admin_write ON public.place_places;
CREATE POLICY place_places_admin_write ON public.place_places
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON TABLE public.place_places IS
  'Pool địa điểm crawled từ foody/pasgo/riviu để AI itinerary làm nguồn gợi ý cho agenda.';