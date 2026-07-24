-- Run this script in your Supabase SQL Editor to support customization settings and language preferences per user

-- 1. Add language column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- 2. Add customization_settings JSONB column to public.profiles if not exists with rich default layout structure
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customization_settings jsonb DEFAULT '{
  "brand_color": "#4F46E5",
  "layout": {
    "streak": true,
    "calendar": true,
    "notes": true,
    "timer": true,
    "ai": true
  },
  "widget_sizes": {
    "streak": "medium",
    "calendar": "large",
    "notes": "medium",
    "timer": "medium",
    "ai": "large"
  }
}'::jsonb;

-- 3. Sync existing users to have valid defaults if null
UPDATE public.profiles 
SET 
  language = COALESCE(language, 'en'),
  customization_settings = COALESCE(customization_settings, '{
    "brand_color": "#4F46E5",
    "layout": {
      "streak": true,
      "calendar": true,
      "notes": true,
      "timer": true,
      "ai": true
    },
    "widget_sizes": {
      "streak": "medium",
      "calendar": "large",
      "notes": "medium",
      "timer": "medium",
      "ai": "large"
    }
  }'::jsonb);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
