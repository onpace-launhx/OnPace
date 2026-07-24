-- ============================================================
-- OnPace: Announcements & Feedback Forms Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'feedback')),
  display_type  TEXT NOT NULL DEFAULT 'pin' CHECK (display_type IN ('pin', 'popup')),
  questions     JSONB DEFAULT '[]'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Announcement responses table
CREATE TABLE IF NOT EXISTS public.announcement_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id   UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responses         JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_ann_responses_user ON public.announcement_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_ann_responses_ann ON public.announcement_responses(announcement_id);

-- 4. Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_responses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: announcements
-- All authenticated users can read active announcements
DROP POLICY IF EXISTS "announcements_read_active" ON public.announcements;
CREATE POLICY "announcements_read_active" ON public.announcements
  FOR SELECT USING (is_active = true OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
  ));

-- Only admins can insert
DROP POLICY IF EXISTS "announcements_admin_insert" ON public.announcements;
CREATE POLICY "announcements_admin_insert" ON public.announcements
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

-- Only admins can update (e.g. deactivate)
DROP POLICY IF EXISTS "announcements_admin_update" ON public.announcements;
CREATE POLICY "announcements_admin_update" ON public.announcements
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

-- 6. RLS Policies: announcement_responses
-- Users can see their own responses; admins see all
DROP POLICY IF EXISTS "ann_responses_read" ON public.announcement_responses;
CREATE POLICY "ann_responses_read" ON public.announcement_responses
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

-- Users can insert their own response
DROP POLICY IF EXISTS "ann_responses_insert" ON public.announcement_responses;
CREATE POLICY "ann_responses_insert" ON public.announcement_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Done! Tables created and RLS policies configured.
-- ============================================================
