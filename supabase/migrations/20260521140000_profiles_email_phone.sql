-- Add email & phone to profiles; sync on signup and backfill existing users.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill email / display_name for rows created without them.
UPDATE public.profiles AS p
SET
  email = COALESCE(p.email, u.email),
  display_name = COALESCE(
    NULLIF(TRIM(p.display_name), ''),
    u.raw_user_meta_data ->> 'display_name',
    split_part(u.email, '@', 1)
  ),
  phone = COALESCE(
    NULLIF(TRIM(p.phone), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'phone'), '')
  )
FROM auth.users AS u
WHERE p.id = u.id;

INSERT INTO public.profiles (id, display_name, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
  u.email
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, public.profiles.email),
  display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);
