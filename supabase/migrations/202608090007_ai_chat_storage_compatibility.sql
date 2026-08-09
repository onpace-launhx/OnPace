-- Keep the persistent AI chat schema compatible with the application. A
-- missing legacy column must never stop an authenticated AI response.

alter table public.ai_chat_messages
  add column if not exists role text;

alter table public.ai_chat_messages
  add column if not exists content text;

-- Existing rows from prior variants remain readable when they already use the
-- current columns. New writes always provide both fields from the app.
alter table public.ai_chat_messages
  alter column role set default 'user';

create index if not exists ai_chat_messages_session_created_id_idx
  on public.ai_chat_messages (session_id, created_at, id);

notify pgrst, 'reload schema';
