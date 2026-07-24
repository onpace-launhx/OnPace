-- Run this script in your Supabase SQL Editor to make admin functions self-contained and bulletproof

-- 1. Redefine get_profiles_with_emails using direct role checks
CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  plan text,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone,
  discount_percent integer,
  permissions text[],
  email text
) AS $$
BEGIN
  -- Direct role verification (bypasses dependency on public.is_admin function)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query student email addresses.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.grade_level,
    p.role,
    p.plan,
    p.trial_ends_at,
    p.created_at,
    p.discount_percent,
    p.permissions,
    u.email::text
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id -- LEFT JOIN for seeded/mock users
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Redefine delete_user_direct using direct role checks
CREATE OR REPLACE FUNCTION public.delete_user_direct(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Direct role verification
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can delete user accounts.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine update_user_profile_admin using direct role checks
CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_name text,
  new_grade text,
  new_email text,
  new_discount integer
)
RETURNS void AS $$
BEGIN
  -- Direct role verification
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update student profiles.';
  END IF;

  -- Check email clash
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(email) = lower(trim(new_email)) AND id <> target_user_id
  ) THEN
    RAISE EXCEPTION 'Email address is already in use by another user.';
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET
    full_name = new_name,
    grade_level = new_grade,
    discount_percent = new_discount
  WHERE id = target_user_id;

  -- Update email
  UPDATE auth.users
  SET
    email = lower(trim(new_email)),
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
