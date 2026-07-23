-- 1. Create a helper function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old policies that caused infinite recursion
DROP POLICY IF EXISTS "Allow select for owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for owners and admins" ON public.profiles;

-- 3. Re-create policies using the helper function
CREATE POLICY "Allow select for owners and admins" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Allow update for owners and admins" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

-- 4. Secure the system_settings table.
-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop any public select/update policies on system_settings to prevent direct column reading
DROP POLICY IF EXISTS "Only admins can select settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.system_settings;

-- 5. Create secure RPC functions for setting and checking the Gemini API Key
-- These are SECURITY DEFINER functions, meaning they run with postgres privileges
-- but explicitly authorize that the caller (auth.uid()) is an admin.
CREATE OR REPLACE FUNCTION public.set_gemini_key(key_value text)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can set the API key.';
  END IF;

  INSERT INTO public.system_settings (id, gemini_api_key, updated_at)
  VALUES (1, key_value, now())
  ON CONFLICT (id) DO UPDATE 
  SET gemini_api_key = EXCLUDED.gemini_api_key, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_gemini_key()
RETURNS boolean AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query this setting.';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.system_settings
    WHERE id = 1 AND gemini_api_key IS NOT NULL AND gemini_api_key <> ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add secure function to fetch the API key on the backend
-- This function authorizes that the caller is logged in AND is either a Pro tier member or Admin.
-- It is called only on the server, masking the API key completely from the browser frontend.
CREATE OR REPLACE FUNCTION public.get_gemini_api_key()
RETURNS text AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in.';
  END IF;

  IF NOT (public.is_admin(auth.uid()) OR (SELECT plan FROM public.profiles WHERE id = auth.uid()) = 'pro') THEN
    RAISE EXCEPTION 'Unauthorized: Requires Pro tier subscription.';
  END IF;

  RETURN (SELECT gemini_api_key FROM public.system_settings WHERE id = 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
