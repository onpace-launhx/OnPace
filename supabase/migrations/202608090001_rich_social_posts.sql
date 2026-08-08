-- Formatting markers are stored with the post, while the API enforces a
-- 400-character limit on the text users actually see.
alter table public.posts
  drop constraint if exists posts_content_check;

alter table public.posts
  add constraint posts_content_check
  check (char_length(trim(content)) between 1 and 1200);
