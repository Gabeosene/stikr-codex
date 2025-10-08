# Minimal Template

This is a [React Native](https://reactnative.dev/) project built with [Expo](https://expo.dev/) and [React Native Reusables](https://reactnativereusables.com).

It was initialized using the following command:

```bash
npx @react-native-reusables/cli@latest init -t stikemup-app
```

## Getting Started

To run the development server:

```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
```

After installing dependencies, duplicate the provided environment template so Expo can load the Supabase credentials at runtime:

```bash
cp .env.example .env
```

Update the values in `.env` with your Supabase project's URL and a freshly rotated anon key before starting the dev server.

## Local Supabase development

This project ships with a Supabase CLI configuration so you can spin up a local Postgres + Studio stack in Codespaces or CI:

```bash
npm install
npm run db:start   # launches the Supabase stack defined in supabase/config.toml
# in a separate terminal
npm run db:seed    # resets the database using migrations and seeds it with demo data
```

The Supabase CLI stores data in `.supabase` by default. Stop the containers with `npm run db:stop` when you're done developing locally.

This will start the Expo Dev Server. Open the app in:

- **iOS**: press `i` to launch in the iOS simulator _(Mac only)_
- **Android**: press `a` to launch in the Android emulator
- **Web**: press `w` to run in a browser

You can also scan the QR code using the [Expo Go](https://expo.dev/go) app on your device. This project fully supports running in Expo Go for quick testing on physical devices.

## Adding components

You can add more reusable components using the CLI:

```bash
npx react-native-reusables/cli@latest add [...components]
```

> e.g. `npx react-native-reusables/cli@latest add input textarea`

If you don't specify any component names, you'll be prompted to select which components to add interactively. Use the `--all` flag to install all available components at once.

## Project Features

- ⚛️ Built with [Expo Router](https://expo.dev/router)
- 🎨 Styled with [Tailwind CSS](https://tailwindcss.com/) via [Nativewind](https://www.nativewind.dev/)
- 📦 UI powered by [React Native Reusables](https://github.com/founded-labs/react-native-reusables)
- 🚀 New Architecture enabled
- 🔥 Edge to Edge enabled
- 📱 Runs on iOS, Android, and Web

## Learn More

To dive deeper into the technologies used:

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [Nativewind Docs](https://www.nativewind.dev/)
- [React Native Reusables](https://reactnativereusables.com)

## Supabase auth event backfill (server pull)

To capture server-side sign-ins and sign-outs alongside the client/edge `public.auth_events`, run the migration [`supabase/migrations/20250108151500_events.sql`](./supabase/migrations/20250108151500_events.sql) using the SQL editor in the Supabase dashboard (or any SQL client authenticated with the service role key).

This script will:

- Create a lightweight `public.events` table populated from `auth.audit_log_entries`.
- Upsert sign-in and sign-out rows immediately via `public.refresh_events_from_auth()`.
- Schedule a one-minute pg_cron job to keep `public.events` synced going forward.

### Verifying the sync

You should see recent server-sourced events appear after the job runs:

```sql
-- Confirm the job is registered
select jobname, schedule, command
from cron.job
where jobname = 'sync_auth_events_from_audit_log';

-- Review the last 24 hours of sign-ins/outs sourced from auth.audit_log_entries
select event_type, count(*)
from public.events
where happened_at >= now() - interval '24 hours'
group by event_type
order by event_type;

select id, happened_at, event_type, user_id
from public.events
where happened_at >= now() - interval '24 hours'
order by happened_at desc
limit 25;
```

Once those queries return data, your `public.events` table is successfully mirroring the Supabase Auth audit log.
