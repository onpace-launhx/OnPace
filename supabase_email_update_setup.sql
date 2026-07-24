-- Run this script in your Supabase SQL Editor to enable direct email changes without verification

CREATE OR REPLACE FUNCTION public.update_user_email_direct(new_email text)
RETURNS void AS $$
BEGIN
  -- Verify user session is active
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in.';
  END IF;

  -- Verify email format is not empty
  IF new_email IS NULL OR new_email = '' THEN
    RAISE EXCEPTION 'Invalid Email';
  END IF;

  -- Direct update on auth.users table (bypassing normal confirmation triggers)
  UPDATE auth.users
  SET 
    email = lower(trim(new_email)),
    email_confirmed_at = now(), -- Confirm immediately
    updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
