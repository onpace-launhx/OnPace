-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  grade_level text,
  daily_study_goal_minutes integer default 60,
  streak_count integer default 0,
  last_active_at timestamp with time zone
);

-- Set up Row Level Security
alter table public.profiles enable row level security;

create policy "Users can check their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Create a trigger that automatically inserts a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, grade_level)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'grade_level');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
