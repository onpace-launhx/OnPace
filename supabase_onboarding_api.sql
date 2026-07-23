-- Add has_onboarded and pro_expires_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_onboarded boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamp with time zone DEFAULT null;

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Drop old courses policies if any
DROP POLICY IF EXISTS "Users can manage their own courses" ON public.courses;

CREATE POLICY "Users can manage their own courses" ON public.courses
  FOR ALL USING (auth.uid() = user_id);

-- Create system_settings table (accessible only to Admins)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  gemini_api_key text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop old settings policies if any
DROP POLICY IF EXISTS "Only admins can select settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.system_settings;

CREATE POLICY "Only admins can select settings" ON public.system_settings
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update settings" ON public.system_settings
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Insert default row
INSERT INTO public.system_settings (id, gemini_api_key) 
VALUES (1, null)
ON CONFLICT DO NOTHING;
