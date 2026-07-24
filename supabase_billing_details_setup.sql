-- Run this script in your Supabase SQL Editor to support detailed billing, grace periods, and payment retry rules

-- 1. Alter profiles table to add tracking fields for trials, grace periods, next billing date, and retry failures
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grace_days_granted integer DEFAULT 0; -- custom grace period per user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_payment_attempts integer DEFAULT 0; -- consecutive failed attempts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone DEFAULT null;

-- 2. Alter purchase_history table to store transaction statuses, errors, and next renewal dates
ALTER TABLE public.purchase_history ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending'));
ALTER TABLE public.purchase_history ADD COLUMN IF NOT EXISTS failed_reason text DEFAULT null;
ALTER TABLE public.purchase_history ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone DEFAULT null;

-- 3. Alter system_settings table to store global payment retry and cancellation rules
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS max_failed_payment_attempts integer DEFAULT 3;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS global_grace_days integer DEFAULT 3;

-- 4. Redefine get_profiles_with_emails to include these billing and grace columns
CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE (
  id uuid,
  full_name text,
  grade_level text,
  role text,
  plan text,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone,
  discount_percent integer,
  permissions text[],
  email text,
  trial_start_at timestamp with time zone,
  grace_days_granted integer,
  failed_payment_attempts integer,
  next_billing_date timestamp with time zone
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can query student email addresses.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.grade_level,
    p.role,
    p.plan,
    p.trial_ends_at,
    u.created_at,
    p.discount_percent,
    p.permissions,
    u.email::text,
    p.trial_start_at,
    p.grace_days_granted,
    p.failed_payment_attempts,
    p.next_billing_date
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Redefine update_student_plan_admin to include these new fields
CREATE OR REPLACE FUNCTION public.update_student_plan_admin_v2(
  target_user_id uuid,
  target_plan text,
  target_expires_at timestamp with time zone,
  target_grace_days integer,
  target_failed_attempts integer,
  target_next_billing timestamp with time zone
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid() AND (public.profiles.role = 'admin' OR public.profiles.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can update plans.';
  END IF;

  UPDATE public.profiles
  SET
    plan = target_plan,
    trial_ends_at = target_expires_at,
    grace_days_granted = target_grace_days,
    failed_payment_attempts = target_failed_attempts,
    next_billing_date = target_next_billing
  WHERE id = target_user_id;

  -- Sync subscription_status and billing_cycle columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='subscription_status'
  ) THEN
    EXECUTE format('
      UPDATE public.profiles
      SET 
        subscription_status = %L,
        billing_cycle = %L
      WHERE id = %L',
      CASE WHEN target_plan = 'free' THEN 'none' WHEN target_expires_at IS NULL AND target_next_billing IS NULL THEN 'active' ELSE 'trialing' END,
      CASE WHEN target_plan = 'free' THEN 'none' WHEN target_expires_at IS NULL AND target_next_billing IS NULL THEN 'lifetime' ELSE 'none' END,
      target_user_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
