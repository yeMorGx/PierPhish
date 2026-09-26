create table if not exists public.pierphish_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 48),
  avatar_path text check (
    avatar_path is null
    or avatar_path = user_id::text || '/avatar'
  ),
  tour_completed_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pierphish_user_preferences enable row level security;

revoke all on table public.pierphish_user_preferences from anon;
revoke all on table public.pierphish_user_preferences from authenticated;
grant select, insert, update, delete on table public.pierphish_user_preferences to authenticated;
grant all on table public.pierphish_user_preferences to service_role;

drop policy if exists "Users read own PierPhish preferences"
  on public.pierphish_user_preferences;
create policy "Users read own PierPhish preferences"
  on public.pierphish_user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own PierPhish preferences"
  on public.pierphish_user_preferences;
create policy "Users create own PierPhish preferences"
  on public.pierphish_user_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own PierPhish preferences"
  on public.pierphish_user_preferences;
create policy "Users update own PierPhish preferences"
  on public.pierphish_user_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own PierPhish preferences"
  on public.pierphish_user_preferences;
create policy "Users delete own PierPhish preferences"
  on public.pierphish_user_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  1572864,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own profile avatars" on storage.objects;
create policy "Users read own profile avatars"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users upload own profile avatars" on storage.objects;
create policy "Users upload own profile avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users update own profile avatars" on storage.objects;
create policy "Users update own profile avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users delete own profile avatars" on storage.objects;
create policy "Users delete own profile avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
