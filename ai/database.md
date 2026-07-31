# Data model

This document describes the schema expected by `src/api/base44Client.js`. It is inferred from read/write code; no SQL migrations are included in the repository. Confirm deployed column types, indexes, constraints, and RLS policies in Supabase before altering the model.

## Supabase tables in active use

### `profiles`

| Column | Usage |
| --- | --- |
| `id` | profile record ID |
| `user_id` | authenticated user ID; exposed as `created_by_id` in the app |
| `username`, `display_name`, `bio`, `avatar_url` | profile identity/content |
| `social_links` | JSON object for social URLs and `profile_customization` |
| `discord_channel_id`, `discord_channel_name` | selected Discord destination |
| `is_public` | mapped by adapter; no current UI control was found |
| `created_at`, `updated_at` | ordering/display metadata |

`social_links.profile_customization` stores `banner_desktop`, `banner_mobile`, and `section_order` (`socials`, `folders`, `reviews`). Avatar and banner uploads are read as browser data URLs; no storage upload is performed by the current profile UI.

### `reviews`

| Column | Usage |
| --- | --- |
| `id`, `user_id`, `created_at`, `updated_at` | identity, ownership, sorting |
| `username` | reviewer name snapshot |
| `spotify_album_id`, `spotify_artist_id` | supported by adapter; review page currently does not populate them when saving |
| `album_title`, `artist`, `album_art_url`, `release_year` | album metadata |
| `tracks` | JSON array of `{ position, title, rating }` |
| `album_rating`, `use_manual_rating`, `manual_rating`, `notes` | review rating/content |
| `reactions`, `comments` | JSON arrays modified by the interaction endpoint |
| `folder_id`, `folder_name` | optional folder reference and stored name |

Reaction objects contain `id`, `userId`, `userName`, `emoji`, and `created_at`. Comment objects contain `id`, `userId`, `userName`, `text`, `created_at`, and optionally `edited_at`.

### `folders`

`id`, `user_id`, `name`, `created_at`, and `updated_at` are expected. Folders are created from the profile page and selected on the review page or used as a Home filter.

### `follows`

`id`, `user_id`, `following_user_id`, `following_username`, and `created_at` are expected. The adapter exposes the first two IDs as `created_by_id` and `following_id` respectively.

## Other persisted/local data

- `track-by-track-local-store-v1`: legacy entity store. On first authenticated use, the adapter attempts to migrate eligible Profile, Review, Folder, and Follow records to Supabase.
- `track-by-track-legacy-supabase-migrated:<userId>`: migration-complete flag.
- `track-by-track-users` and `track-by-track-session`: client-side session/profile cache used by the adapter.
- `track-by-track-theme`: selected application theme.
- `notifications:last-seen:<userId>` and `notifications:dismissed:<userId>`: notification state. Notifications are derived from follows and review interactions; there is no notifications table in this repository.

## Base44 definitions

`base44/entities/` declares `Profile`, `Review`, `Follow`, `FeaturedShare`, and `User` for Base44. These definitions do not fully describe the active Supabase schema; for example, the current profile/review code uses fields that are absent from those JSONC definitions.

`FeaturedShare` is only referenced by the Base44 Discord-sharing function, not by the active Supabase adapter. TODO: verify whether an equivalent deployed table or entity is still required.

## Required verification before database changes

- TODO: obtain/version the actual Supabase DDL and RLS policies.
- TODO: verify uniqueness enforcement for `profiles.user_id`, `profiles.username`, and any desired follow/folder uniqueness rules.
- TODO: verify foreign keys and deletion behavior between profiles, reviews, folders, follows, and Supabase Auth users.
