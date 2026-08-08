-- Keep chat lists ordered by the most recently active conversation even when
-- messages are created from a different OnPace surface (for example, the
-- floating coach). This trigger runs after the message's owner policies have
-- already allowed the insert.
create or replace function public.touch_ai_chat_session_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_chat_sessions
  set updated_at = new.created_at
  where id = new.session_id;

  return new;
end;
$$;

drop trigger if exists trg_ai_chat_session_touch_on_message on public.ai_chat_messages;

create trigger trg_ai_chat_session_touch_on_message
after insert on public.ai_chat_messages
for each row
execute function public.touch_ai_chat_session_on_message();

create index if not exists ai_chat_sessions_user_updated_id_idx
  on public.ai_chat_sessions (user_id, updated_at desc, id desc);
