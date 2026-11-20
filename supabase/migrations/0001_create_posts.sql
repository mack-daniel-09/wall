-- Wall: posts table
-- Run this once in the Supabase dashboard (SQL Editor -> New query -> paste -> Run).
-- Safe to run more than once, and safe to run on a "posts" table that was already
-- created with the shorter SQL from the challenge guide (id, user_id, body, created_at).

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

-- Columns the app needs (added if missing).
alter table public.posts add column if not exists author text not null default 'Anonymous';
alter table public.posts add column if not exists body   text not null default '';

-- Tighten columns that may exist from the guide's SQL without NOT NULL / defaults.
update public.posts set body = '' where body is null;
alter table public.posts alter column body set default '';
alter table public.posts alter column body set not null;
update public.posts set created_at = now() where created_at is null;
alter table public.posts alter column created_at set default now();
alter table public.posts alter column created_at set not null;

-- Length rules (280-character limit enforced in the database too).
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts drop constraint if exists posts_body_length;
alter table public.posts add constraint posts_body_length check (char_length(body) <= 280) not valid;
alter table public.posts drop constraint if exists posts_author_length;
alter table public.posts add constraint posts_author_length check (char_length(author) between 1 and 80) not valid;
alter table public.posts drop constraint if exists posts_has_content;
alter table public.posts add constraint posts_has_content check (char_length(btrim(body)) > 0) not valid;

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Let the browser key (anon / publishable) use the table. Newer Supabase projects
-- don't grant this automatically, which causes "permission denied for table posts".
grant usage on schema public to anon, authenticated;
grant select, insert on public.posts to anon, authenticated;

-- Row Level Security: anyone can read and add posts, nobody can edit or delete them.
alter table public.posts enable row level security;

drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a post" on public.posts;
create policy "Anyone can add a post"
  on public.posts for insert
  to anon, authenticated
  with check (true);

-- Realtime: push new posts to every open browser.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- Starter posts (only inserted when the table is empty).
insert into public.posts (author, body, created_at)
select * from (values
  ('Anna',     'Hey Greg, did you debug your coffee maker yet? Last cup tasted like JavaScript errors.', now() - interval '2 hours'),
  ('Adelaida', 'Greg, saw your last coding session—pretty sure you broke Stack Overflow again! 🧯', now() - interval '3 hours'),
  ('Juho',     'Greg, are you still coding in pajamas, or have you upgraded to full-time sweatpants mode?', now() - interval '4 hours'),
  ('Maija',    'Greg, rumor has it your computer has more stickers than code running on it. Confirm?', now() - interval '5 hours'),
  ('Alex',     'Yo Greg, just pulled an all-nighter on the assignment. Turns out sleep deprivation doesn''t improve coding skills. Weird!', now() - interval '6 hours'),
  ('Sheryl',   'Greg, when are we gonna deploy your latest dance moves to production? #AgileDancer', now() - interval '8 hours')
) as seed(author, body, created_at)
where not exists (select 1 from public.posts);
