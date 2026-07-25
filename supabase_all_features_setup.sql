-- ============================================================
-- OnPace Complete Platform Upgrade Setup SQL (Robust Auto-Migration)
-- Copy and run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Create System Settings Table if not exists
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default'
);

-- Ensure all required columns exist on system_settings (in case table already existed)
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS payment_gateway_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS payment_disabled_message JSONB DEFAULT '{
  "tr": "Plan değişikliği yalnızca size verilen promocode üzerinden veya sistem yöneticiniz tarafından yapılabilir.",
  "en": "Plan changes can only be made using a promo code issued to you or by your system administrator.",
  "es": "Los cambios de plan solo se pueden realizar utilizando un código de promoción emitido para usted o por su administrador del sistema.",
  "zh": "仅能通过发放给您的优惠码或由系统管理员进行套餐变更。"
}'::jsonb;

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS plan_prices JSONB DEFAULT '{
  "plus": 9,
  "pro": 19,
  "founding": 49
}'::jsonb;

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS resend_api_key TEXT DEFAULT '';

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Insert initial row if not exists
INSERT INTO public.system_settings (id, payment_gateway_enabled, maintenance_mode)
VALUES ('default', false, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Add email_notifications_enabled to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- 3. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_admin_insert" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
    OR auth.uid() = user_id
  );

-- 4. Persistent AI Chat History Tables
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Study Assistant Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_sessions_all_own" ON public.ai_chat_sessions;
CREATE POLICY "ai_chat_sessions_all_own" ON public.ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages(session_id);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_messages_all_own" ON public.ai_chat_messages;
CREATE POLICY "ai_chat_messages_all_own" ON public.ai_chat_messages
  FOR ALL USING (
    session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid())
  );

-- 5. Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_read_all" ON public.system_settings;
CREATE POLICY "system_settings_read_all" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_settings_admin_update" ON public.system_settings;
CREATE POLICY "system_settings_admin_update" ON public.system_settings
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "system_settings_admin_insert" ON public.system_settings;
CREATE POLICY "system_settings_admin_insert" ON public.system_settings
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );
