-- Run this script in your Supabase SQL Editor to enable database-managed Cloudflare R2 configurations and note attachments

-- 1. Alter system_settings to support Cloudflare R2
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS r2_access_key_id text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS r2_secret_access_key text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS r2_endpoint text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS r2_bucket_name text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS r2_public_url text;

-- 2. Alter notes to support file attachments
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS file_url text;

-- 3. Create set_system_r2_settings function
CREATE OR REPLACE FUNCTION public.set_system_r2_settings(
  access_key_val text,
  secret_key_val text,
  endpoint_val text,
  bucket_val text,
  public_url_val text
)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can adjust R2 settings.';
  END IF;

  INSERT INTO public.system_settings (id, r2_access_key_id, r2_secret_access_key, r2_endpoint, r2_bucket_name, r2_public_url, updated_at)
  VALUES (
    1, 
    access_key_val, 
    secret_key_val, 
    endpoint_val, 
    bucket_val, 
    public_url_val,
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    r2_access_key_id = COALESCE(NULLIF(access_key_val, ''), public.system_settings.r2_access_key_id),
    r2_secret_access_key = COALESCE(NULLIF(secret_key_val, ''), public.system_settings.r2_secret_access_key),
    r2_endpoint = COALESCE(NULLIF(endpoint_val, ''), public.system_settings.r2_endpoint),
    r2_bucket_name = COALESCE(NULLIF(bucket_val, ''), public.system_settings.r2_bucket_name),
    r2_public_url = COALESCE(NULLIF(public_url_val, ''), public.system_settings.r2_public_url),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create get_system_r2_settings function (Admin panel status queries)
CREATE OR REPLACE FUNCTION public.get_system_r2_settings()
RETURNS TABLE (
  has_access_key boolean,
  has_secret_key boolean,
  endpoint text,
  bucket_name text,
  public_url text
) AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query R2 status.';
  END IF;

  RETURN QUERY
  SELECT 
    (r2_access_key_id IS NOT NULL AND r2_access_key_id <> '') as has_access_key,
    (r2_secret_access_key IS NOT NULL AND r2_secret_access_key <> '') as has_secret_key,
    r2_endpoint,
    r2_bucket_name,
    r2_public_url
  FROM public.system_settings
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create secure backend function to get active R2 config for authenticated users
CREATE OR REPLACE FUNCTION public.get_active_r2_config()
RETURNS TABLE (
  access_key_id text,
  secret_access_key text,
  endpoint text,
  bucket_name text,
  public_url text
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in.';
  END IF;

  RETURN QUERY
  SELECT 
    r2_access_key_id,
    r2_secret_access_key,
    r2_endpoint,
    r2_bucket_name,
    r2_public_url
  FROM public.system_settings
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
