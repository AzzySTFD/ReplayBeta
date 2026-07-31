# SpinRate

SpinRate is an authenticated music-review platform centered on albums. A user can search Spotify albums, rate individual tracks, calculate or override an album rating, add review notes, organize reviews in folders, maintain a public profile, follow other users, and react to or comment on reviews.

## Active application stack

- React 18 and Vite.
- JavaScript/JSX application code, with limited TypeScript in the `base44/` and `discord/` support directories.
- React Router for navigation; Framer Motion for page transitions; TanStack Query provider configured at the application root.
- Tailwind CSS with Radix/shadcn-style primitives in `src/components/ui`.
- Supabase for browser authentication and the active persistent data layer.
- Vercel-compatible API handlers under `api/`; an Express proxy under `server/` supplies the equivalent routes during local development.

The package name remains `replayreviews`, and some local-storage keys and legacy artifacts still use `track-by-track`; the rendered product branding is SpinRate.

## Application structure

- `src/main.jsx` mounts `App`.
- `src/App.jsx` provides authentication and query context, sets up routes, protects signed-in screens, and adds route-transition animation.
- `src/components/Layout.jsx` renders desktop navigation and the mobile header/bottom tab bar.
- `src/pages/` contains feature screens.
- `src/api/base44Client.js` is the active persistence/integration adapter. It exposes a Base44-shaped `db` API while making Supabase calls and same-origin API requests.
- `api/` contains production/serverless handlers.
- `server/spotifyProxy.js` provides local `/api` routes and `server/importHelpers.js` contains import-page parsing helpers.
- `base44/` contains Base44 entities/functions preserved in the repository.
- `discord/` contains separate Discord server-generator tooling.

## Routes and user flows

Public routes are `/login`, `/register`, `/forgot-password`, and `/reset-password`. All other routes require an authenticated user.

| Route | Screen | Current behavior |
| --- | --- | --- |
| `/` | Home | Searches Spotify, starts a review from a result or random album, and shows personal reviews, followed-user feed, and Featured tab. |
| `/review/new` | Review | Receives selected album data via router state and loads its tracks. |
| `/review/:id` | Review | Edits an owned review or renders another user's review read-only. |
| `/discover` | Discover | Lists/filter-searches profiles and follows/unfollows users. |
| `/notifications` | Notifications | Shows locally derived follow/reaction/comment activity. |
| `/profile` | Profile settings | Edits the signed-in user's profile, folders, appearance settings, imports, and account session. |
| `/user/:userId` | Public profile | Shows profile details, follower/following context, folders, and reviews. |

## Authentication

Email/password registration and login use Supabase Auth. Registration stores username and display name in Supabase user metadata and ensures a matching application profile. Discord OAuth is initiated through Supabase.

The adapter additionally maintains local session/user records in localStorage (`track-by-track-session` and `track-by-track-users`) for compatibility. The password-reset screens currently use a localStorage reset-token/password flow rather than Supabase recovery APIs; this is implemented behavior, not a server-delivered recovery workflow.

## Core product features

### Album discovery and reviews

- Spotify album search requests up to 10 US-market album results.
- `Surprise Me!` generates a two-letter seed, looks up Spotify album results, and selects a random result; it retries up to six times.
- Spotify track lookup reads an album's returned track list. The current handlers use the embedded first page of Spotify tracks.
- A track rating is selected on a 0.5-step scale from 0.0 to 10.0. Clicking the current whole-star value selects the preceding half step.
- Album ratings are calculated from rated tracks unless the reviewer enables a manual override.
- Reviews include album metadata, track ratings, rating settings, notes, optional folder details, reactions, and comments.

### Profiles, social features, and organization

- Profiles include username, display name, bio, avatar, social links, Discord channel fields, and profile customization data.
- Social link inputs currently cover Instagram, Twitter, TikTok, Twitch, YouTube, Kick, and website.
- Profile customization stores desktop/mobile banner image values and an order for Social links, Folders, and Reviews.
- Image selection uses browser `FileReader` data URLs; the current profile UI does not upload files to Supabase Storage.
- Users can create folders and assign a review to one folder. Home can filter reviews by folder or unfiled state.
- Following is modeled as one user following another user. Home builds a feed from reviews by followed users.
- Review viewers can toggle one of four reactions and add comments. A comment's owner can edit or delete that comment.
- Notifications are calculated from follows and reactions/comments on the signed-in user's reviews. Seen and dismissed state is stored in localStorage, and the navigation badge polls every 15 seconds.

### Appearance and responsive UI

The default UI is dark with rounded low-contrast surfaces, stone/slate accent gradients, and amber ratings. Desktop has a sticky top navigation; mobile has a safe-area-aware header and fixed bottom tab bar. The profile page provides local-only theme customization for solid/gradient presentation plus accent and surface colors. Theme state is stored under `track-by-track-theme`.

## Persistence model

The active `db` adapter maps its entity interface to these Supabase table names:

- `Profile` -> `profiles`
- `Review` -> `reviews`
- `Folder` -> `folders`
- `Follow` -> `follows`

It maps database `user_id` to app-facing `created_by_id`, and database `following_user_id` to `following_id`. Reviews use JSON arrays for `tracks`, `reactions`, and `comments`.

The adapter also attempts a one-time migration of eligible localStorage data from `track-by-track-local-store-v1` into Supabase after authentication. No Supabase migrations, DDL, or RLS policies are committed to this repository. TODO: verify the deployed schema, constraints, and policies before making database changes.

## API integrations

The browser invokes these through `db.functions.invoke`:

| Function | Route | Purpose |
| --- | --- | --- |
| `spotifySearch` | `POST /api/spotify/search` | Album search. |
| `spotifyRandomAlbum` | `POST /api/spotify/random-album` | Random Spotify album selection. |
| `spotifyAlbumTracks` | `GET /api/spotify/albums/tracks?albumId=` | Album tracks, with dynamic-route fallback. |
| `getNotableReleases` | `POST /api/spotify/notable-releases` | Genre-oriented release lookup; no current page invokes it. |
| `importProfile` | `POST /api/import/profile` | Heuristic HTML extraction of album candidates. |
| `reviewInteractions` | `POST /api/reviews/interactions` | Comment and reaction mutation. |

Spotify API credentials are read server-side from `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. The review-interaction endpoint needs `SUPABASE_SERVICE_ROLE_KEY` plus a Supabase URL.

The import flow recognizes Rate Your Music, Album of the Year, Letterboxd, and Discogs hostnames, fetches a provided URL, extracts candidates heuristically, searches Spotify for each candidate, and creates reviews. The current implementation is not a guaranteed structured import.

## Base44 and Discord artifacts

The repository still contains Base44 configuration, entity definitions, and Deno functions for Spotify, featured albums, and Discord. The active browser application does not import the Base44 SDK; it imports the local Supabase adapter.

This matters for incomplete UI paths:

- The Home Featured tab invokes `getFeaturedAlbums`, but the active adapter returns an empty list.
- Saving a review invokes `shareFeaturedToDiscord`, but the active adapter does not implement that function.
- `DiscordConnect` calls adapter connector methods that currently return stub success values.
- The standalone `discord/` project is not imported by the browser application.

TODO: determine which, if any, Base44/Discord artifacts are deployed or operational before building on them.

## Development commands

- `npm run dev`: starts the local Express proxy and Vite on available loopback ports.
- `npm run dev:proxy`: starts only the Express proxy.
- `npm run build`: Vite production build.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript checking with `jsconfig.json`.

Node test files exist in `tests/` and `server/`, but there is no `npm test` script.

## Current implementation risks / TODOs

- TODO: Replace or clearly remove the local-only password-reset behavior.
- TODO: Authenticate review-interaction API callers server-side and derive their user ID from a verified token; the current service-role endpoint accepts `userId` in request body.
- TODO: Version Supabase migrations and RLS policies in the repository.
- TODO: Decide whether Featured and Discord should be fully implemented in the Supabase/Vercel path or removed/aligned with Base44.
- TODO: Assess Spotify track pagination for long releases.
- TODO: Add a runnable test command and coverage for authorization, review mutations, and adapter mappings.
