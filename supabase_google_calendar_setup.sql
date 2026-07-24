-- =============================================
-- Google OAuth Token Storage for AI Calendar Access
-- Run this in Supabase SQL Editor
-- =============================================

-- Create user_google_tokens table
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text DEFAULT 'https://www.googleapis.com/auth/calendar',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one token row per user
CREATE UNIQUE INDEX IF NOT EXISTS user_google_tokens_user_id_idx
  ON public.user_google_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see/manage their own tokens
CREATE POLICY "Users can manage their own google tokens"
  ON public.user_google_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_google_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_google_token_updated_at
  BEFORE UPDATE ON public.user_google_tokens
  FOR EACH ROW EXECUTE FUNCTION update_google_token_updated_at();
