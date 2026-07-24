-- Run this script in your Supabase SQL Editor to enable Focus Session tracking for analytics and AI feedback

-- 1. Create focus_sessions table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  duration_seconds integer NOT NULL, -- Actual focused duration in seconds
  mode text NOT NULL CHECK (mode IN ('study', 'break')),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage their own focus sessions" ON public.focus_sessions 
  FOR ALL USING (auth.uid() = user_id);
