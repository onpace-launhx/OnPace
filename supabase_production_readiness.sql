-- Run this script in your Supabase SQL Editor to prepare OnPace for Production readiness

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_gender text CHECK (preferred_gender IN ('male', 'female', 'any')) DEFAULT 'any';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_promocode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promocode_expires_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matches_used_this_month integer DEFAULT 0;

-- Posts table for social sharing
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_flagged boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
CREATE POLICY "Users can manage their own posts" ON public.posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);

-- peer_matches table for anonymous matchmaker double opt-in
CREATE TABLE IF NOT EXISTS public.peer_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_two_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_one_approved boolean DEFAULT false NOT NULL,
  user_two_approved boolean DEFAULT false NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'declined')) DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.peer_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their matches" ON public.peer_matches;
CREATE POLICY "Users can manage their matches" ON public.peer_matches 
  FOR ALL USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- announcements table for admin bulletins/feedbacks
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text CHECK (type IN ('announcement', 'feedback')) DEFAULT 'announcement' NOT NULL,
  display_type text CHECK (display_type IN ('pin', 'popup')) DEFAULT 'pin' NOT NULL,
  form_questions jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  )
);

-- announcement_responses table
CREATE TABLE IF NOT EXISTS public.announcement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_announcement UNIQUE (user_id, announcement_id)
);

ALTER TABLE public.announcement_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their responses" ON public.announcement_responses;
CREATE POLICY "Users can manage their responses" ON public.announcement_responses 
  FOR ALL USING (auth.uid() = user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
