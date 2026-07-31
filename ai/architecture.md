# Architecture

## Request and data flow

```text
Browser (React/Vite)
  -> src/api/base44Client.js (`db` compatibility interface)
     -> Supabase Auth and tables: profiles, reviews, folders, follows
     -> same-origin /api routes for Spotify, imports, review interactions
  -> Vite proxy in local development
     -> server/spotifyProxy.js (Express)
  -> Vercel handlers in deployment
     -> api/**
```

`src/main.jsx` mounts `App`. `App` wraps the router in `AuthProvider` and `QueryClientProvider`, applies page transition animation, and gates non-auth routes behind `ProtectedRoute`.

## Routes

| Route | Page | Access |
| --- | --- | --- |
| `/` | `Home` | authenticated |
| `/discover` | `Discover` | authenticated |
| `/notifications` | `Notifications` | authenticated |
| `/profile` | `ProfilePage` | authenticated |
| `/user/:userId` | `UserProfile` | authenticated |
| `/review/:id` | `Review` | authenticated; `new` is an in-memory creation state |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | auth pages | public |

`Layout` owns desktop navigation and the mobile header/tab bar. It polls notifications every 15 seconds while authenticated.

## Client persistence adapter

The app imports `db` from `src/api/base44Client.js`. It preserves Base44-shaped calls such as `db.entities.Review.filter(...)`, while mapping active collections to Supabase:

- `Profile` -> `profiles`
- `Review` -> `reviews`
- `Folder` -> `folders`
- `Follow` -> `follows`

It maps database `user_id` to the application-facing `created_by_id`, maps `following_user_id` to `following_id`, and accepts Base44-style sort names such as `-updated_date`.

The adapter also contains a one-time, per-user migration from localStorage data (`track-by-track-local-store-v1`) to Supabase. LocalStorage continues to hold the local session record, theme, notification seen/dismissed state, and migration flag.

## External integrations

### Spotify

The client calls `db.functions.invoke` for search, random albums, track lookup, notable releases, and imports. The adapter makes same-origin `/api` requests in a browser and uses `http://127.0.0.1:3001` server-side. Vite proxies `/api` to the local Express server.

Vercel endpoints use `api/_lib/spotify.js`; it obtains a Spotify client-credentials token for each request. The local proxy implements the same basic endpoints and adds notable-release and profile-import endpoints.

### Supabase

Browser code creates a Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Authentication uses Supabase email/password APIs and Discord OAuth. The `api/reviews/interactions.js` route creates a service-role client to update review JSON fields.

### Base44 and Discord artifacts

`base44/` holds entity definitions and Deno functions for Spotify search/tracks, featured albums, Discord channel discovery, and featured-album sharing. The current browser adapter does not call the Base44 SDK. Its `connectors` methods are stubs, and its `getFeaturedAlbums` function returns an empty list.

`discord/` contains an independent `discord.js` server-generator project driven by `DISCORD_TOKEN`; no application source imports it. TODO: establish whether this tooling is used operationally.

## API surface used by the browser

| Adapter function | HTTP route | Purpose |
| --- | --- | --- |
| `spotifySearch` | `POST /api/spotify/search` | Search up to 10 US-market albums. |
| `spotifyRandomAlbum` | `POST /api/spotify/random-album` | Select a random result from seeded Spotify album searches. |
| `spotifyAlbumTracks` | `GET /api/spotify/albums/tracks?albumId=` | Fetch an album's embedded first page of tracks; dynamic-route fallback exists. |
| `getNotableReleases` | `POST /api/spotify/notable-releases` | Available in the adapter/proxy; no current page invokes it. |
| `importProfile` | `POST /api/import/profile` | Fetch and heuristically extract up to eight album candidates. |
| `reviewInteractions` | `POST /api/reviews/interactions` | Add/edit/delete a comment or toggle a reaction. |

## Important boundaries

- UI ownership checks are implemented before edit/delete actions, but database protection depends on unversioned Supabase policies. TODO: audit deployed RLS.
- Interaction requests send `userId` from the browser; the service-role endpoint does not verify the caller's Supabase JWT. This is the current implementation, not a documented security guarantee.
- API album-track handlers read `data.tracks.items`, which is Spotify's paginated first page only. TODO: add pagination only if complete album track lists are required.
