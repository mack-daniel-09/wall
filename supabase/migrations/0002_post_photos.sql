-- Wall: photo uploads (Supabase Storage)
-- Run this AFTER 0001_create_posts.sql, in the Supabase dashboard:
-- SQL Editor -> New query -> paste -> Run.

-- 1. Posts can now carry a photo. The column stores the file's path inside the
--    "post-images" bucket (e.g. "posts/3f2a....jpg"), not a full URL, so a post
--    can only point at images that were uploaded to this project.
alter table public.posts
  add column if not exists image_path text
  check (image_path is null or image_path ~ '^posts/[A-Za-z0-9._-]+$');

-- 2. A post needs text, a photo, or both (text is still capped at 280 characters).
alter table public.posts alter column body set default '';
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts drop constraint if exists posts_body_length;
alter table public.posts add constraint posts_body_length check (char_length(body) <= 280) not valid;
alter table public.posts drop constraint if exists posts_has_content;
alter table public.posts add constraint posts_has_content
  check (char_length(btrim(body)) > 0 or image_path is not null) not valid;

-- 3. A public bucket for the photos: 5 MB max, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. Anyone may upload into the posts/ folder of that bucket. No update or delete
--    policy, so uploaded photos can't be replaced or removed from the browser.
drop policy if exists "Anyone can upload post images" on storage.objects;
create policy "Anyone can upload post images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'posts');
