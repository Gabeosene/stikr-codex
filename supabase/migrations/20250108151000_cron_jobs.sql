-- Scheduled tasks to keep the analytics schema healthy.

create extension if not exists "pg_cron";

select
  cron.schedule(
    job_name => 'refresh_mv_auth_daily',
    schedule => '0 5 * * *',
    command => $$
      refresh materialized view public.mv_auth_daily;
    $$
  );

select
  cron.schedule(
    job_name => 'purge_old_auth_events',
    schedule => '30 4 * * *',
    command => $$
      delete from raw.auth_events
      where occurred_at < now() - interval '90 days';
    $$
  );

select
  cron.schedule(
    job_name => 'auth_signin_health_check',
    schedule => '15 6 * * *',
    command => $$
      insert into analytics.auth_event_alerts (alerted_at, alert_message)
      select now(), 'No sign-ins detected in the last 24 hours'
      where not exists (
        select 1
        from raw.auth_events
        where event_type = 'sign_in'
          and occurred_at >= now() - interval '24 hours'
      );
    $$
  );
