-- 1. Update set_system_ai_settings to prevent key erasing on empty/null submits
CREATE OR REPLACE FUNCTION public.set_system_ai_settings(
  gemini_val text,
  openai_val text,
  provider_val text
)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can adjust AI settings.';
  END IF;

  INSERT INTO public.system_settings (id, gemini_api_key, openai_api_key, active_provider, updated_at)
  VALUES (
    1, 
    gemini_val, 
    openai_val, 
    provider_val, 
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    gemini_api_key = COALESCE(NULLIF(gemini_val, ''), public.system_settings.gemini_api_key),
    openai_api_key = COALESCE(NULLIF(openai_val, ''), public.system_settings.openai_api_key),
    active_provider = provider_val,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes" ON public.notes 
  FOR ALL USING (auth.uid() = user_id);

-- 3. Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own flashcards" ON public.flashcards;
CREATE POLICY "Users can manage their own flashcards" ON public.flashcards 
  FOR ALL USING (auth.uid() = user_id);
