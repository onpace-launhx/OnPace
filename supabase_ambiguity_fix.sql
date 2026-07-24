-- Run this script in your Supabase SQL Editor to resolve ambiguity issues and create a safe plan update helper

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
  -- Prefix columns with table name (public.profiles) to resolve PL/pgSQL variable conflicts
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
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
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_user_direct(target_user_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can delete user accounts.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_name text,
  new_grade text,
  new_email text,
  new_discount integer
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update student profiles.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(email) = lower(trim(new_email)) AND id <> target_user_id
  ) THEN
    RAISE EXCEPTION 'Email address is already in use by another user.';
  END IF;

  UPDATE public.profiles
  SET
    full_name = new_name,
    grade_level = new_grade,
    discount_percent = new_discount
  WHERE id = target_user_id;

  UPDATE auth.users
  SET
    email = lower(trim(new_email)),
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Safe admin plan adjuster (updates plan and trial dates, and dynamically sets subscription status if exists)
CREATE OR REPLACE FUNCTION public.update_student_plan_admin(
  target_user_id uuid,
  target_plan text,
  target_expires_at timestamp with time zone
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update plans.';
  END IF;

  -- 1. Update core fields
  UPDATE public.profiles
  SET
    plan = target_plan,
    trial_ends_at = target_expires_at
  WHERE id = target_user_id;

  -- 2. Dynamically update subscription_status and billing_cycle columns if they exist in the schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='subscription_status'
  ) THEN
    EXECUTE format('
      UPDATE public.profiles
      SET 
        subscription_status = %L,
        billing_cycle = %L
      WHERE id = %L',
      CASE WHEN target_plan = 'free' THEN 'none' WHEN target_expires_at IS NULL THEN 'active' ELSE 'trialing' END,
      CASE WHEN target_plan = 'free' THEN 'none' WHEN target_expires_at IS NULL THEN 'lifetime' ELSE 'none' END,
      target_user_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
