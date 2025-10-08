# Codebase Improvement Suggestions

This document captures potential enhancements identified while reviewing the current codebase. The items are grouped by file to make the follow-up work easier to triage.

## `app/index.tsx`

- **Run data queries reliably on native** – `isClient` is computed only from `typeof window !== 'undefined'`, which is `false` on iOS and Android even though the component is client-side. Because the queries are gated by this flag, native builds will never fetch stickers. Consider deriving the flag from `Platform.OS !== 'web'` or directly using Expo Router's `useFocusEffect`/`useAppState` guards to avoid SSR while still enabling native execution.
- **Avoid logging sensitive environment info** – The effect that logs `EXPO_PUBLIC_SUPABASE_URL` and the first characters of the anon key is useful during debugging but risks exposing credentials in production builds and in Expo Go logs. Replacing it with explicit validation (e.g., using `console.warn` only when the values are missing) or stripping it entirely before release would be safer.
- **Deduplicate header configuration** – `SCREEN_OPTIONS` duplicates the `title`, `headerTransparent`, `headerShadowVisible`, and `headerRight` definitions. Extract the shared settings into a base object and only override the pieces that depend on the scheme (the background color), which will simplify future tweaks.
- **Handle empty or broken image URLs gracefully** – Rendering assumes `item.image_url` is defined. Providing a fallback URI or placeholder component when the URL is empty (or when the image fails to load) would harden the list against inconsistent data.
- **Broaden Supabase response typing** – Casting `data` to `Sticker[]` bypasses type safety. Returning `data ?? []` directly and adjusting the calling code to narrow the type (or defining `fetchApprovedStickers` to resolve with `Sticker[]`) would avoid unnecessary casting and surface schema drift sooner.
- **Probe effect cleanup** – The REST "probe" `useEffect` performs a background fetch solely for logging. Once connectivity is confirmed this should either be behind a development flag or removed, because it duplicates work, adds noise, and forces a second request for each load.

## `app/sticker/[id].tsx`

- **Normalize parameter handling** – The component dereferences `sid!` in the query functions. Guarding before invoking the queries (or using the `enabled` flag plus a type-safe helper that narrows `sid`) would remove the non-null assertions and help TypeScript enforce the invariant.
- **Stabilize effect dependencies** – The error logging effect depends on `stickerQ.error` and `expQ.error`, but the dependency array only lists the boolean flags. Include the error objects (or, alternatively, convert to `useEffect(() => { ... }, [stickerQ.status, expQ.status])`) to avoid stale closures.
- **Extract shared UI primitives** – `Center`, `GhostButton`, and `ErrorView` are implemented inline. Moving them into `components/ui` would promote reuse, keep styling consistent across screens, and make it easier to unit test them.
- **Improve experience CTA labels** – `getCtaText` falls back to `String(exp.type).replace('_', ' ')`, which only replaces the first underscore. Using a more robust formatter (e.g., `exp.type.replace(/_/g, ' ')`) or a mapping constant would prevent awkward copy for new types.
- **Protect against empty image URLs** – As in the browse screen, render a placeholder when `s.image_url` is missing or fails to load to avoid blank sections and runtime warnings.

## `lib/supabase.ts`

- **Fail fast without crashing the bundle** – Throwing an error at module initialization prevents the entire app from loading when environment variables are missing (including in Expo's preview environments). Instead, consider logging a descriptive warning and returning a no-op client in development, or defer the validation until the client is first used so the rest of the UI can still render with a friendly error state.
- **Unify storage adapters** – The current code duplicates storage adapter wiring for web and native. Extracting a helper that returns the correct adapter would reduce branching and make it easier to add support for SecureStore if persistent sessions are ever needed on native.

## Data-layer follow-ups

- **Limit Supabase selections** – Each query uses `.select('*')`. Fetching only the fields actually required by the UI (e.g., `id`, `title`, `artist_name`, `image_url`, `status`) will reduce payload size and future-proof the app if sensitive columns are added.
- **Add query error boundaries** – The UI currently logs errors but keeps the last loaded data around. Leveraging React Query's `useErrorBoundary` or displaying a dedicated error view on the list screen would give users clearer feedback when Supabase is misconfigured.

These improvements should help harden the app for real-world use while keeping the developer experience smooth.
