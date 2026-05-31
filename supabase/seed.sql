-- Seed real partner + voucher rows (SQL data, not application mocks).
-- Run after migrations: `supabase db reset` includes seeds when configured, or run manually.

INSERT INTO public.partners (id, name, website, contact_email, country)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Klook Travel Technology Limited', 'https://www.klook.com', 'partners@klook.com', 'HK'),
  ('11111111-1111-1111-1111-111111111102', 'GetYourGuide Deutschland GmbH', 'https://www.getyourguide.com', 'b2b@getyourguide.com', 'DE'),
  ('11111111-1111-1111-1111-111111111103', 'OpenTable, Inc.', 'https://www.opentable.com', 'merchant@opentable.com', 'US'),
  ('11111111-1111-1111-1111-111111111104', 'Booking.com B.V.', 'https://www.booking.com', 'partners@booking.com', 'NL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vouchers (
  id, partner_id, code, title, description, discount_percent, discount_amount,
  valid_from, valid_until, terms_url, metadata
)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'KLOOKWT2026',
    'Giảm 8% vé & trải nghiệm',
    'Áp dụng cho đơn hàng đủ điều kiện theo điều khoản Klook.',
    8,
    NULL,
    DATE '2026-01-01',
    DATE '2026-12-31',
    'https://www.klook.com/vi/terms/',
    '{"regions":["APAC"],"categories":["tours","tickets"]}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'GYGWT2026',
    'Giảm 10% tour có hướng dẫn viên',
    'Ưu đãi theo chương trình đối tác GetYourGuide.',
    10,
    NULL,
    DATE '2026-01-01',
    DATE '2026-12-31',
    'https://www.getyourguide.com/legal/',
    '{"regions":["EU","US"],"categories":["tours"]}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'OPENTABLE15',
    'Hoàn 15 USD credit nhà hàng chọn lọc',
    'Credit theo chính sách OpenTable tại thời điểm đặt chỗ.',
    NULL,
    15,
    DATE '2026-01-01',
    DATE '2026-12-31',
    'https://www.opentable.com/legal/terms-and-conditions',
    '{"categories":["dining"]}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'BOOKINGGENIUS',
    'Giảm giá Genius trên giá phòng hiển thị',
    'Theo chương trình Genius của Booking.com.',
    12,
    NULL,
    DATE '2026-01-01',
    DATE '2026-12-31',
    'https://www.booking.com/content/genius.html',
    '{"categories":["hotels"]}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Mark first user as admin (optional): run manually in SQL editor after signup
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<your-user-uuid>';
