-- Public media bucket for admin promotion covers + business location/media images
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'media');
