-- Keep legacy and future study-session writes compatible with the required
-- end_time column. The application always sends end_time, while this trigger
-- protects older clients and direct inserts that only provide duration.

update public.study_sessions
set end_time = start_time + make_interval(mins => greatest(15, coalesce(duration, 60)))
where end_time is null;

create or replace function public.fill_study_session_end_time()
returns trigger
language plpgsql
as $$
begin
  if new.end_time is null then
    new.end_time := new.start_time + make_interval(
      mins => greatest(15, coalesce(new.duration, 60))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_study_sessions_fill_end_time on public.study_sessions;
create trigger trg_study_sessions_fill_end_time
before insert on public.study_sessions
for each row execute function public.fill_study_session_end_time();
