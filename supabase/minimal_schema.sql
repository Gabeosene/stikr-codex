-- Minimal schema for stickers, captures, and experiences
-- Creates core tables, indexes, trigger, and row level security policies

create extension if not exists "pgcrypto" with schema public;

create table if not exists public.stickers (
    id uuid primary key default gen_random_uuid(),
    title text,
    artist_name text,
    image_url text,
    latitude double precision,
    longitude double precision,
    status text not null default 'pending' check (status in ('pending', 'approved', 'flagged')),
    created_at timestamptz not null default now()
);

create index if not exists stickers_status_created_at_idx
    on public.stickers (status, created_at desc);

alter table public.stickers enable row level security;

drop policy if exists "Public can read approved stickers" on public.stickers;
create policy "Public can read approved stickers"
    on public.stickers
    for select
    using (status = 'approved');

create table if not exists public.experiences (
    id uuid primary key default gen_random_uuid(),
    sticker_id uuid not null references public.stickers(id) on delete cascade,
    type text not null check (type in ('url', 'webgl', 'ar', 'deep_link')),
    payload jsonb,
    created_at timestamptz not null default now()
);

create index if not exists experiences_sticker_id_idx
    on public.experiences (sticker_id);

alter table public.experiences enable row level security;

drop policy if exists "Experiences for approved stickers" on public.experiences;
create policy "Experiences for approved stickers"
    on public.experiences
    for select
    using (exists (
        select 1
        from public.stickers s
        where s.id = sticker_id
          and s.status = 'approved'
    ));

create table if not exists public.captures (
    id uuid primary key default gen_random_uuid(),
    sticker_id uuid not null references public.stickers(id) on delete cascade,
    user_id uuid references auth.users(id),
    image_url text not null,
    caption text,
    created_at timestamptz not null default now()
);

create index if not exists captures_user_id_created_at_idx
    on public.captures (user_id, created_at desc);

alter table public.captures enable row level security;

drop policy if exists "Users manage their captures" on public.captures;
create policy "Users manage their captures"
    on public.captures
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create or replace function public.set_capture_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.user_id is null then
        new.user_id := auth.uid();
    end if;
    return new;
end;
$$;

drop trigger if exists set_capture_user_id on public.captures;
create trigger set_capture_user_id
    before insert on public.captures
    for each row
    execute function public.set_capture_user_id();
