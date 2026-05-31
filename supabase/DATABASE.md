# WanderTale Database Architecture

## Design principles

1. **`auth.users`** — authentication only (password, session, email verification).
2. **`public.profiles`** — single source of truth for user-facing identity:
   - `display_name` — set at signup
   - `email` — copied from auth at signup; synced when auth email changes
   - `phone` — only user-editable field in profile UI
3. **`public.user_preferences`** — travel/dietary preferences (separate from identity).
4. **Infra tables** (`ota_price_cache`, `checkpoint_*`) — backend/service_role only; RLS enabled with no client policies.

## Core tables

```
auth.users
    ├── profiles (1:1)
    ├── user_preferences (1:1)
    ├── trips (1:N)
    │     ├── trip_days (1:N)
    │     │     └── trip_activities (1:N)
    │     └── weather_snapshots (1:N)
    ├── bookings (1:N)
    └── hotel_agent_threads (1:N)

partners (1:N) vouchers
```

## Trip data model

- `trips.itinerary_json` — denormalized snapshot for fast reads / AI output.
- `trip_days` + `trip_activities` — normalized structure for queries and edits.
- Backend should treat `itinerary_json` as generated cache; normalized tables as structured source when both exist.

## Signup flow

1. Client calls `auth.signUp` with `display_name` in user metadata.
2. Trigger `on_auth_user_created` inserts `profiles` + `user_preferences`.
3. Client fallback `ensureProfileExists()` only if trigger was missing (legacy).

## Migrations

Apply in order via Supabase CLI or SQL Editor:

```bash
supabase db push
```

Or run each file in `supabase/migrations/` chronologically.

## What was removed (20260521160000)

- `profiles.country`, `profiles.default_budget`, `profiles.default_preferences` — unused / duplicated; preferences live in `user_preferences`.
