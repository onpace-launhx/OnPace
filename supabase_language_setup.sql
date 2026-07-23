-- Add language preference column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en'; -- 'en', 'es', 'zh'
