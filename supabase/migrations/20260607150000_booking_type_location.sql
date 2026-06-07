-- Allow booking type 'location' (sponsored business location bookings).
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_type_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_type_check CHECK (
  type IN ('hotel', 'restaurant', 'ticket', 'transport', 'location', 'other')
);
