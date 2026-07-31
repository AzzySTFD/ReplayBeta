# Implementation status and evidence-based next steps

This is not a speculative feature roadmap. It records implemented work and follow-up items directly indicated by the current codebase.

## Implemented

- Supabase email/password authentication and Discord OAuth initiation.
- Album search, random selection, and track lookup through server-side Spotify credentials.
- Track-by-track reviews, manual rating override, notes, folders, profiles, following, public profiles, comments/reactions, and local notifications.
- Profile appearance controls and local theme customization.
- Vercel handlers plus a local Express development proxy.

## Highest-priority follow-up work

1. Restore or remove incomplete integration paths.
   - Home exposes Featured, but `src/api/base44Client.js` returns `[]` for `getFeaturedAlbums`.
   - Review save invokes `shareFeaturedToDiscord`, but the active adapter has no handler for that name.
   - `DiscordConnect` depends on connector methods that currently return stub success values.
   - Decide whether the active runtime should implement these with Supabase/Vercel or whether Base44 deployment is still authoritative, then align UI and code.

2. Secure review interactions.
   - `POST /api/reviews/interactions` uses a service-role key and trusts the `userId` sent in the request body.
   - TODO: authenticate the caller server-side, derive their user ID from the verified token, and enforce authorization before writing review JSON fields.

3. Version the Supabase database contract.
   - The client expects four Supabase tables, but no migrations/DDL/RLS files are committed.
   - TODO: add migration history and verify all ownership, public-read, username-uniqueness, and follow/folder constraints.

4. Clarify/rework password recovery.
   - Signup/login use Supabase, while reset-token/password mutation is currently localStorage-only.
   - TODO: use Supabase recovery/update APIs or clearly remove the unsupported flow.

5. Resolve legacy Base44 artifacts.
   - The `base44/` code includes functions that appear intended to cover featured albums and Discord, but those function files reference `db` even after creating a `base44` client. TODO: test and repair only if Base44 remains part of the deployment path; otherwise archive/remove through a deliberate migration.

## Quality and maintenance TODOs

- TODO: add a runnable test script; the repository currently has Node test files but no `npm test` command.
- TODO: add coverage for Supabase adapter mappings, authorization failures, review interactions, route guards, and critical review creation/edit paths.
- TODO: determine whether album pagination is required for releases with more than Spotify's returned first-page tracks.
- TODO: assess import parsing reliability and source permissions before promoting it beyond its current heuristic behavior.
- TODO: audit the raw image-data-URL profile/banner approach for storage, payload size, and privacy implications.
- TODO: inspect the standalone `discord/` project and document its operational role or remove duplication.
