-- Create study_groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  course_name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on study_groups
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can see groups to discover them
DROP POLICY IF EXISTS "Anyone can view study groups" ON public.study_groups;
CREATE POLICY "Anyone can view study groups" ON public.study_groups 
  FOR SELECT USING (true);

-- Manage policy: Creators can edit their groups
DROP POLICY IF EXISTS "Creators can manage study groups" ON public.study_groups;
CREATE POLICY "Creators can manage study groups" ON public.study_groups 
  FOR ALL USING (auth.uid() = created_by);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Enable RLS on memberships
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- Membership policies
DROP POLICY IF EXISTS "Users can manage their own memberships" ON public.group_memberships;
CREATE POLICY "Users can manage their own memberships" ON public.group_memberships 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view group memberships" ON public.group_memberships;
CREATE POLICY "Anyone can view group memberships" ON public.group_memberships 
  FOR SELECT USING (true);

-- Seed some default study groups if none exist
INSERT INTO public.study_groups (name, description, course_name, member_count)
VALUES 
  ('AP Calculus BC Study Team', 'Mastering derivatives, integrals, and series approximations together.', 'AP Calculus', 12),
  ('SAT Math Prep Circle', 'Tips and speed hacks for both calculator and non-calculator sections.', 'SAT Prep', 8),
  ('AP Biology Study Circle', 'Deep dive into cell respiration, genetics, and evolutionary concepts.', 'AP Biology', 15),
  ('ACT Science Crackers', 'Data interpretation techniques and speed practice.', 'ACT Prep', 6)
ON CONFLICT DO NOTHING;
