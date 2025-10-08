-- Supabase server-pull events setup
-- Maps auth.audit_log_entries into a lightweight public.events table and keeps it fresh.

-- Make sure pg_cron is available (required for the 1-minute refresh job).
create extension if not exists pg_cron with schema cron;

-- Store auth events pulled from the auth schema in a table that client apps can query.
create table if not exists public.events (
  id bigint primary key,
  happened_at timestamptz not null,
  event_type text not null,
  user_id uuid,
  instance_id uuid,
  ip_address inet,
  description text,
  metadata jsonb default '{}'::jsonb
);

comment on table public.events is 'Server-sourced auth events synced from auth.audit_log_entries.';

-- Ensure we keep metadata tidy even when entries are updated.
alter table public.events
  alter column metadata set default '{}'::jsonb;

-- RLS is managed separately; disable by default so that API policies can be set explicitly later.
alter table public.events disable row level security;

-- Upsert all sign-in/out entries from auth.audit_log_entries into public.events.
create or replace function public.refresh_events_from_auth()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.events as e (
    id,
    happened_at,
    event_type,
    user_id,
    instance_id,
    ip_address,
    description,
    metadata
  )
  select
    a.id,
    a.created_at,
    coalesce(a.payload ->> 'event', a.event_type, a.payload ->> 'action', 'unknown') as event_type,
    a.user_id,
    a.instance_id,
    nullif(a.ip_address, '')::inet,
    a.description,
    jsonb_build_object(
      'event_id', a.event_id,
      'payload', a.payload,
      'raw_metadata', a.metadata
    )
  from auth.audit_log_entries a
  where coalesce(a.payload ->> 'event', a.event_type, a.payload ->> 'action') in ('user_signed_in', 'user_signed_out')
  on conflict (id) do update
    set
      happened_at = excluded.happened_at,
      event_type = excluded.event_type,
      user_id = excluded.user_id,
      instance_id = excluded.instance_id,
      ip_address = excluded.ip_address,
      description = excluded.description,
      metadata = excluded.metadata;
end;
$$;

-- Populate the table immediately.
select public.refresh_events_from_auth();

-- Schedule a 1-minute sync job that keeps pulling new events.
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'sync_auth_events_from_audit_log'
  ) then
    perform cron.schedule(
      'sync_auth_events_from_audit_log',
      '* * * * *',
      $$select public.refresh_events_from_auth();$$
    );
  end if;
end;
$$;

-- Ensure the service role can manage this data; grant read access to authenticated clients if desired.
grant select on table public.events to authenticated, anon;
