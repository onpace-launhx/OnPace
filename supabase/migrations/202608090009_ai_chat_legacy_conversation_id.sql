-- Some pre-production chat schemas retained conversation_id as a required
-- legacy column although current chat messages belong to session_id. Keep
-- existing rows intact while allowing session-based chat writes.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_chat_messages'
      and column_name = 'conversation_id'
      and is_nullable = 'NO'
  ) then
    alter table public.ai_chat_messages
      alter column conversation_id drop not null;
  end if;
end
$$;

notify pgrst, 'reload schema';
