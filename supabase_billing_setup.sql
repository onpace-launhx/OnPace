-- 1. Add trial and billing status columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '21 days');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'none'; -- 'monthly', 'yearly', 'lifetime', 'none'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing'; -- 'trialing', 'active', 'expired', 'none'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_queries_today integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ai_query_at timestamp with time zone DEFAULT null;

-- 2. Create purchase_history table
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  plan_type text NOT NULL, -- 'pro_monthly', 'pro_yearly', 'founding_member'
  billing_cycle text NOT NULL, -- 'monthly', 'yearly', 'lifetime'
  stripe_payment_intent_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchase_history;
CREATE POLICY "Users can view their own purchases" ON public.purchase_history 
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Update get_active_ai_config to allow active queries for limits to be handled inside app code
CREATE OR REPLACE FUNCTION public.get_active_ai_config()
RETURNS TABLE (
  api_key text,
  provider text
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in.';
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN system_settings.active_provider = 'openai' THEN openai_api_key
      ELSE gemini_api_key
    END as api_key,
    system_settings.active_provider as provider
  FROM public.system_settings
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
