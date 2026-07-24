-- Run this script in your Supabase SQL Editor to allow unauthenticated users (guests) to verify promo codes during registration

-- 1. Drop the restrictive select policy
DROP POLICY IF EXISTS "Authenticated users can view promocodes" ON public.promocodes;

-- 2. Create a new public select policy so registration page can check code validity
CREATE POLICY "Anyone can view promocodes" ON public.promocodes
  FOR SELECT USING (true);
