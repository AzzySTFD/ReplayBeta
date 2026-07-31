# SpinRate project overview

SpinRate is a signed-in music-review web app. Users search Spotify albums, rate tracks and albums, write notes, organize reviews into folders, view other users, follow them, and interact with reviews through reactions and comments.

## Runtime and stack

- React 18 with Vite and React Router.
- JavaScript/JSX is the primary application language. TypeScript is used in the `base44/` and `discord/` support directories.
- Tailwind CSS, shadcn/Radix-style components under `src/components/ui`, Lucide icons, Framer Motion, and TanStack Query (provider configured in `src/App.jsx`).
- Supabase provides browser authentication and the application's active persistence layer through `src/api/base44Client.js`.
- Vercel-style handlers in `api/` and an Express proxy in `server/spotifyProxy.js` provide Spotify, import, and interaction endpoints.
- Base44 configuration/functions remain in the repository, but the browser app imports the local Supabase adapter rather than `@base44/sdk`.

## What is implemented

- Email/password signup and login, Discord OAuth initiation, local session bookkeeping, and a client-side password-reset placeholder flow.
- Album search, random-album selection, and track lookup via Spotify API routes.
- Track-level half-step ratings, derived or manually overridden album ratings, notes, editing, and deletion of reviews.
- Review folders, profile creation/customization, public user profiles, following, review feeds, and locally derived notifications.
- Review reactions and comments through a server endpoint that writes to Supabase.
- Theme selection stored locally in the browser.
- Profile import attempts for URLs/text, including Rate Your Music and Album of the Year host recognition.

## How to run

`npm run dev` starts both the local Express proxy and Vite; it selects available loopback ports starting at 3001 and 5173. `npm run dev:proxy` starts only the proxy. `npm run build`, `npm run lint`, and `npm run typecheck` are also defined.

Required active client configuration: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Server routes additionally require `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Review-interaction routes require `SUPABASE_SERVICE_ROLE_KEY` plus `SUPABASE_URL` (or `VITE_SUPABASE_URL`).

## Repository map

- `src/`: browser application.
- `src/api/base44Client.js`: Supabase adapter exposing the legacy `db` interface used by pages/components.
- `api/`: Vercel-compatible API handlers.
- `server/`: local Express proxy and import parsing helpers.
- `base44/`: Base44 entity/function artifacts and shared helpers.
- `discord/`: separate Discord server generator; it is not imported by the browser application.
- `tests/`: Node tests for the adapter's Spotify route selection and import helpers.

## Known implementation boundaries

- The rendered Featured tab calls `getFeaturedAlbums`, but the active browser adapter currently returns an empty list for that function.
- The browser adapter's Discord connector methods are no-op success responses. The richer Discord code exists only in Base44 function artifacts.
- No Supabase migrations or schema definitions are versioned in this repository. The actual database schema, constraints, and RLS policies must be verified in Supabase before changing persistence code.
- TODO: Confirm which Base44 artifacts, if any, are deployed and still used outside the Vite/Supabase runtime.
