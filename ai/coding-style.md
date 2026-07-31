# Coding style and conventions

## Source conventions

- Use ES modules, React function components, and hooks.
- Application source is mainly `.jsx`/`.js`; preserve that unless a file's existing TypeScript context calls for `.ts`.
- Use the `@/` alias for imports from `src`.
- Use double quotes and semicolons in most React application files. Server and adapter files have some single-quote style; match the file being edited.
- Keep async data loading in page-local hooks/callbacks unless a reusable abstraction already exists.
- Report user-facing operation failures through the existing `useToast`/`toast` pattern where that page already uses it; log unexpected details with `console.error`.

## UI conventions

- Styling is Tailwind-first. Reuse components from `src/components/ui` before adding new primitives.
- The default visual language is dark, compact, rounded, and subtle: `bg-white/[0.03]`, low-opacity borders, stone/slate gradients, and amber rating stars.
- Existing components favor responsive Tailwind breakpoints, a desktop top navigation, and a mobile fixed bottom tab bar. Preserve safe-area behavior and at least 16px form-control text on mobile.
- Use Lucide React icons. Use the existing `Image` wrapper for album cover imagery where applicable.
- Theme customization is CSS-variable based. Do not hard-code around `--theme-accent`, `--theme-accent-2`, or the app-theme classes without checking `src/index.css`.

## Data conventions

- Page/component code uses `db` from `@/api/base44Client`, not direct Supabase calls.
- Treat `created_by_id` as the app-facing user-owner field; the adapter maps it to database `user_id`.
- Call entity methods as `list`, `filter`, `get`, `create`, `update`, and `delete`. Sort fields may be passed in Base44-like form, e.g. `-updated_date`.
- Do not add columns or assume RLS behavior: this repository contains no database migration history.
- Keep review `tracks`, `comments`, and `reactions` in their established JSON shapes documented in `database.md`.

## Routing and auth conventions

- Add authenticated pages inside the protected/Layout route structure in `src/App.jsx`.
- Use `useAuth()` for the current user and auth lifecycle. Do not bypass the `AuthProvider` gate.
- Pass album data to `/review/new` in React Router location state, as the existing search and random-album flows do.

## Validation

- Run `npm run lint`, `npm run typecheck`, and `npm run build` when a change reasonably permits it.
- Existing Node tests are not exposed through an npm script. TODO: add a documented test script if the project adopts broader automated coverage.
