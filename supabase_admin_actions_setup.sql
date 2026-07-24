-- Run this script in your Supabase SQL Editor to enable admin actions (updating student profiles and deleting accounts)

-- 1. Create secure admin function to delete a user account from auth.users (cascades automatically)
CREATE OR REPLACE FUNCTION public.delete_user_direct(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Verify if executing user is an administrator
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can delete user accounts.';
  END IF;

  -- Delete from auth.users (cascades to public.profiles, notes, tasks, focus_sessions, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create secure admin function to update user profiles (including auth.users emails)
CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_name text,
  new_grade text,
  new_email text,
  new_discount integer
)
RETURNS void AS $$
BEGIN
  -- Verify if executing user is an administrator
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update student profiles.';
  END IF;

  -- Update profiles table
  UPDATE public.profiles
  SET
    full_name = new_name,
    grade_level = new_grade,
    discount_percent = new_discount
  WHERE id = target_user_id;

  -- Update auth.users email
  UPDATE auth.users
  SET
    email = lower(trim(new_email)),
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
