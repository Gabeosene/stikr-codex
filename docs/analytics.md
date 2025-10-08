# Analytics Maintenance Tasks

The Supabase instance uses `pg_cron` to keep the auth rollups healthy. After running
`scripts`/`psql` with `supabase/sql/cron_jobs.sql`, verify the following:

## Cron registrations

```sql
select jobname, schedule, command
from cron.job
where jobname in (
  'refresh_mv_auth_daily',
  'purge_old_auth_events',
  'auth_signin_health_check'
)
order by jobname;
```

You should see three rows (one per task) with the schedules `0 5 * * *`, `30 4 * * *`, and `15 6 * * *`.

## Materialized view freshness

```sql
refresh materialized view public.mv_auth_daily;
```

Re-running the command manually should succeed without errors, confirming the job command is valid.

## Raw event retention

```sql
select count(*)
from raw.auth_events
where occurred_at < now() - interval '90 days';
```

The count should trend toward zero after the nightly purge job runs.

## Sign-in health alert

```sql
insert into analytics.auth_event_alerts (alerted_at, alert_message)
select now(), 'Test run'
where not exists (
  select 1
  from raw.auth_events
  where event_type = 'sign_in'
    and occurred_at >= now() - interval '24 hours'
);
```

Running the insert in an environment with no sign-ins in the last 24 hours should add a row to
`analytics.auth_event_alerts`, mirroring what the cron job performs.
