-- 1. Alter system_settings to support OpenAI and active provider selector
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS openai_api_key text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS active_provider text DEFAULT 'gemini';

-- 2. Create helper function to check admin status without recursion (safeguard)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create secure Admin RPC functions to update and query AI settings
CREATE OR REPLACE FUNCTION public.set_system_ai_settings(
  gemini_val text,
  openai_val text,
  provider_val text
)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can adjust AI settings.';
  END IF;

  INSERT INTO public.system_settings (id, gemini_api_key, openai_api_key, active_provider, updated_at)
  VALUES (1, gemini_val, openai_val, provider_val, now())
  ON CONFLICT (id) DO UPDATE 
  SET 
    gemini_api_key = EXCLUDED.gemini_api_key,
    openai_api_key = EXCLUDED.openai_api_key,
    active_provider = EXCLUDED.active_provider,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_system_ai_settings()
RETURNS TABLE (
  has_gemini boolean,
  has_openai boolean,
  active_provider text
) AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query AI status.';
  END IF;

  RETURN QUERY
  SELECT 
    (gemini_api_key IS NOT NULL AND gemini_api_key <> '') as has_gemini,
    (openai_api_key IS NOT NULL AND openai_api_key <> '') as has_openai,
    system_settings.active_provider
  FROM public.system_settings
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure backend function to get active config for users
CREATE OR REPLACE FUNCTION public.get_active_ai_config()
RETURNS TABLE (
  api_key text,
  provider text
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in.';
  END IF;

  IF NOT (public.is_admin(auth.uid()) OR (SELECT plan FROM public.profiles WHERE id = auth.uid()) = 'pro') THEN
    RAISE EXCEPTION 'Unauthorized: Requires Pro tier subscription.';
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN system_settings.active_provider = 'openai' THEN openai_api_key
      ELSE gemini_api_key
    END as api_key,
    system_settings.active_provider as provider
  FROM public.system_settings
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop old system_logs and re-create it referencing public.profiles (resolves PostgREST join mapping issue)
DROP TABLE IF EXISTS public.system_logs CASCADE;

CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert logs" ON public.system_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Only admins can select logs" ON public.system_logs 
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );
