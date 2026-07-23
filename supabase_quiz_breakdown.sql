-- Add parent_id to tasks for sub-task breakdown support
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL, -- Array of {question, options: [], correct_idx, explanation}
  score integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own quizzes" ON public.quizzes;
CREATE POLICY "Users can manage their own quizzes" ON public.quizzes 
  FOR ALL USING (auth.uid() = user_id);
