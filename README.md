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

Update the values in `.env` with your Supabase project's URL and anon key before starting the dev server.

This will start the Expo Dev Server. Open the app in:

- **iOS**: press `i` to launch in the iOS simulator _(Mac only)_
- **Android**: press `a` to launch in the Android emulator
- **Web**: press `w` to run in a browser

You can also scan the QR code using the [Expo Go](https://expo.dev/go) app on your device. This project fully supports running in Expo Go for quick testing on physical devices.

## Web deployment (Vercel)

- Build the static web bundle with `npm run build:web`. This runs `expo export` and writes the optimized web output to the `dist/` directory.
- Deploy the project to Vercel with the build command set to `npm run build:web` and the output directory set to `dist/`.
- The included [`vercel.json`](./vercel.json) configures a single-page-app rewrite (`/(.*) → /`) so [Expo Router](https://expo.dev/router) dynamic routes resolve correctly when a user reloads or deep-links to nested paths.
## EAS Update preview releases

EAS Update enables you to ship OTA previews without submitting a new build to the app stores. This project is pre-configured with a `preview` channel that maps to a matching branch.

### 1. Install the CLI and authenticate

```bash
npm install
npx eas login
```

If you're using CI, set the `EXPO_TOKEN` environment variable instead of logging in interactively. Running `npx eas init` afterwards will register the project with your Expo account and replace `YOUR-EAS-PROJECT-ID` in [`app.json`](./app.json) with the real project ID.

### 2. Create the preview branch and channel

```bash
npx eas branch:create preview
npx eas channel:create preview --branch preview
```

### 3. Publish updates to the preview channel

```bash
npx eas update --branch preview --message "preview"
# or with the included npm script
npm run eas:update:preview
```

Every publish prints a "Project page" URL containing the QR code and shareable link for the release (for example: `https://expo.dev/accounts/<account>/projects/stikemup-app?release-channel=preview`). Share that URL with teammates so they can install the OTA update.

### Loading the preview on devices

1. Install the [Expo Go](https://expo.dev/go) app (or a custom development build) on the target iOS/Android device.
2. Open the "Project page" URL generated after publishing. The page shows both a QR code and a "Open project" button.
3. Scan the QR code with Expo Go or tap the button on the device to load the latest preview update from the `preview` channel.
4. Whenever you push another update with `npm run eas:update:preview`, testers just need to refresh the app in Expo Go to receive the new bundle.

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

To capture server-side sign-ins and sign-outs alongside the client/edge `public.auth_events`, run the SQL in [`supabase_events_setup.sql`](./supabase_events_setup.sql) using the SQL editor in the Supabase dashboard (or any SQL client authenticated with the service role key).

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
