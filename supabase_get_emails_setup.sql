-- Run this script in your Supabase SQL Editor to enable fetching user email addresses for admin views securely

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
  -- Verify if executing user is an administrator
  IF NOT public.is_admin(auth.uid()) THEN
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
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
