-- Run this script in your Supabase SQL Editor to enable Sub-Admin Permissions & Promocodes

-- 1. Alter profiles table to support sub-admin permissions and discount percentages
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0;

-- 2. Update is_admin function to support both super_admin and admin roles
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create promocodes table
CREATE TABLE IF NOT EXISTS public.promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'free_trial', 'lifetime')),
  discount_value integer NOT NULL, -- Percentage (e.g. 50 for 50%) OR duration in days (e.g. 30) OR 0
  max_uses integer, -- NULL means unlimited
  uses_count integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS on promocodes
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for promocodes
DROP POLICY IF EXISTS "Admins can manage promocodes" ON public.promocodes;
CREATE POLICY "Admins can manage promocodes" ON public.promocodes
  FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view promocodes" ON public.promocodes;
CREATE POLICY "Authenticated users can view promocodes" ON public.promocodes
  FOR SELECT USING (auth.uid() is not null);

-- 6. Update handle_new_user() trigger to process promocodes at sign-up securely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger as $$
DECLARE
  promo_code_val text;
  promo_id uuid;
  disc_type text;
  disc_val integer;
  max_u integer;
  curr_u integer;
  start_d timestamptz;
  end_d timestamptz;
  target_plan text := 'free';
  t_ends timestamptz := null;
  target_discount integer := 0;
BEGIN
  promo_code_val := new.raw_user_meta_data->>'promocode';

  -- Check if promocode was submitted
  IF promo_code_val IS NOT NULL AND promo_code_val <> '' THEN
    -- Lookup code
    SELECT id, discount_type, discount_value, max_uses, uses_count, start_date, end_date
    INTO promo_id, disc_type, disc_val, max_u, curr_u, start_d, end_d
    from public.promocodes
    WHERE lower(code) = lower(trim(promo_code_val));

    IF promo_id IS NOT NULL THEN
      -- Verify dates and usage limits
      IF now() >= start_d AND now() <= end_d AND (max_u IS NULL OR curr_u < max_u) THEN
        -- Increment use count
        UPDATE public.promocodes
        SET uses_count = uses_count + 1
        WHERE id = promo_id;

        -- Apply plan changes or discount percent
        IF disc_type = 'lifetime' THEN
          target_plan := 'pro';
        ELSIF disc_type = 'free_trial' THEN
          target_plan := 'pro';
          t_ends := now() + (disc_val || ' days')::interval;
        ELSIF disc_type = 'percentage' THEN
          target_discount := disc_val;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Default first registered user as super_admin if there are no users yet
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    INSERT INTO public.profiles (id, full_name, grade_level, role, plan)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level', 'super_admin', 'pro');
  ELSE
    INSERT INTO public.profiles (id, full_name, grade_level, plan, trial_ends_at, discount_percent)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level', target_plan, t_ends, target_discount);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
