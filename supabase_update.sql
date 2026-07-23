-- Add role and plan columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- Drop old policies to update them
DROP POLICY IF EXISTS "Users can check their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow select for owners and admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for owners and admins" ON public.profiles;

-- Create updated security policies supporting Owner + Admin overrides
-- Note: To avoid recursion, we check if the user is checking their own record first.
CREATE POLICY "Allow select for owners and admins" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow update for owners and admins" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow insert for owners" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );
