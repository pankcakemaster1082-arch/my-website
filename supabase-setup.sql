create extension if not exists pgcrypto;

create table if not exists public.available_builds (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 120),
    description text not null check (char_length(description) between 1 and 2000),
    price_cents integer not null check (price_cents > 0),
    image_path text not null,
    is_available boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.available_build_admins (
    user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.available_builds enable row level security;
alter table public.available_build_admins enable row level security;

create or replace function public.is_available_build_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.available_build_admins
        where user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_available_build_admin() from public;
grant execute on function public.is_available_build_admin() to authenticated;

grant select on public.available_builds to anon, authenticated;
grant insert, update, delete on public.available_builds to authenticated;

drop policy if exists "Anyone can view available builds" on public.available_builds;
create policy "Anyone can view available builds"
    on public.available_builds
    for select
    to anon, authenticated
    using (is_available = true);

drop policy if exists "Admins can view all builds" on public.available_builds;
create policy "Admins can view all builds"
    on public.available_builds
    for select
    to authenticated
    using ((select public.is_available_build_admin()));

drop policy if exists "Admins can add builds" on public.available_builds;
create policy "Admins can add builds"
    on public.available_builds
    for insert
    to authenticated
    with check ((select public.is_available_build_admin()));

drop policy if exists "Admins can update builds" on public.available_builds;
create policy "Admins can update builds"
    on public.available_builds
    for update
    to authenticated
    using ((select public.is_available_build_admin()))
    with check ((select public.is_available_build_admin()));

drop policy if exists "Admins can delete builds" on public.available_builds;
create policy "Admins can delete builds"
    on public.available_builds
    for delete
    to authenticated
    using ((select public.is_available_build_admin()));

drop policy if exists "Admins can view build admin records" on public.available_build_admins;
create policy "Admins can view build admin records"
    on public.available_build_admins
    for select
    to authenticated
    using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('available-builds', 'available-builds', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can list build photos" on storage.objects;
create policy "Admins can list build photos"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'available-builds' and (select public.is_available_build_admin()));

drop policy if exists "Admins can upload build photos" on storage.objects;
create policy "Admins can upload build photos"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'available-builds' and (select public.is_available_build_admin()));

drop policy if exists "Admins can update build photos" on storage.objects;
create policy "Admins can update build photos"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'available-builds' and (select public.is_available_build_admin()))
    with check (bucket_id = 'available-builds' and (select public.is_available_build_admin()));

drop policy if exists "Admins can delete build photos" on storage.objects;
create policy "Admins can delete build photos"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'available-builds' and (select public.is_available_build_admin()));
