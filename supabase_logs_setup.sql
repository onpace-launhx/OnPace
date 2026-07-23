-- Create system_logs table
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to insert logs
DROP POLICY IF EXISTS "Users can insert logs" ON public.system_logs;
CREATE POLICY "Users can insert logs" ON public.system_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Only admins can select logs
DROP POLICY IF EXISTS "Only admins can select logs" ON public.system_logs;
CREATE POLICY "Only admins can select logs" ON public.system_logs 
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );
