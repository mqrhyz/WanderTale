-- P2 staged trip generation: skeleton lịch trước, OTA enrich sau
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS generation_status TEXT NOT NULL DEFAULT 'ready'
CHECK (
  generation_status IN ('generating', 'pricing_pending', 'ready', 'failed')
);

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS hotel_pricing_status TEXT;

COMMENT ON COLUMN public.trips.generation_status IS 'generating | pricing_pending | ready | failed';
COMMENT ON COLUMN public.trips.hotel_pricing_status IS 'pending | ok | cached | empty | timeout | error | skipped';
