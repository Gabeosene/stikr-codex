-- Sync auth audit log entries into a public events table for the client app.

create extension if not exists pg_cron with schema cron;

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

alter table public.events
  alter column metadata set default '{}'::jsonb;

alter table public.events disable row level security;

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

select public.refresh_events_from_auth();

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

grant select on table public.events to authenticated, anon;
