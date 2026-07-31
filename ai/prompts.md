# AI working prompts

These prompts are grounded in the current repository. They intentionally instruct an assistant to verify uncertain deployment/database details rather than inventing them.

## Start a feature task

```text
You are working in the SpinRate repository. Read AGENTS.md and the relevant ai/*.md files first. Preserve the React/Vite/Supabase architecture and the Base44-shaped `db` adapter in src/api/base44Client.js. Search for existing components and flows before adding anything. Do not modify database structure without an explicit migration; this repository currently has no versioned Supabase migrations, so flag schema/RLS uncertainty as TODO. Keep desktop and mobile navigation, dark-theme styling, and responsive behavior intact. Implement only the requested scope, then run the relevant lint/typecheck/build/tests and report results.
```

## Modify persisted data

```text
Before changing SpinRate persistence, inspect src/api/base44Client.js and ai/database.md. The active browser code maps Base44-like entities to Supabase profiles, reviews, folders, and follows. Do not guess table columns, RLS policies, constraints, or migrations: check the deployed Supabase project or mark the work TODO. Preserve the adapter's created_by_id <-> user_id mapping and the established JSON shapes for review tracks, reactions, and comments.
```

## Change an API integration

```text
Trace the full SpinRate call path before editing an integration: browser page/component -> db.functions.invoke -> active API route -> local proxy/Vercel handler. Spotify credentials must stay server-side. Review interaction requests currently reach a service-role endpoint; do not expand this pattern without addressing caller authentication and authorization. Base44 and Discord files are repository artifacts, not proof that the active Vite/Supabase runtime invokes them; verify deployment before relying on them.
```

## UI task

```text
Update SpinRate's existing UI rather than replacing it. Reuse src/components/ui and Tailwind conventions: dark surfaces, subtle borders, rounded cards, stone/slate accents, amber ratings, and mobile-first layouts. Preserve the desktop top nav and mobile bottom tab bar. Respect CSS theme variables and app-theme classes in src/index.css. Use accessible labels and ensure controls remain usable on small screens.
```

## Audit/review task

```text
Review the SpinRate implementation for evidence, not assumptions. Separate active source paths from Base44/Discord legacy artifacts. Report concrete file references, data flow, missing verification, security risks, and test results. Label unknown deployment, schema, and RLS facts as TODO instead of inferring them.
```
