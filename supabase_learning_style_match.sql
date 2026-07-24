-- Run this script in your Supabase SQL Editor to enable Multi-Select Learning Styles and AI Matchmaking

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_styles text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_goals text[] DEFAULT '{}';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
