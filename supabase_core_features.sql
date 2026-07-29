-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  due_date timestamp with time zone,
  priority text DEFAULT 'medium'::text NOT NULL, -- 'high', 'medium', 'low'
  status text DEFAULT 'todo'::text NOT NULL, -- 'todo', 'in_progress', 'completed'
  task_origin text DEFAULT 'manual'::text NOT NULL, -- 'manual', 'ai_schedule', 'ai_breakdown'
  estimated_minutes integer DEFAULT 30 NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_origin text DEFAULT 'manual'::text NOT NULL;

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop old policy if any
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;

CREATE POLICY "Users can manage their own tasks" ON public.tasks 
  FOR ALL USING (auth.uid() = user_id);

-- Create study_sessions table (for calendar blocks)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_ai_scheduled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Drop old policy if any
DROP POLICY IF EXISTS "Users can manage their own study sessions" ON public.study_sessions;

CREATE POLICY "Users can manage their own study sessions" ON public.study_sessions 
  FOR ALL USING (auth.uid() = user_id);
