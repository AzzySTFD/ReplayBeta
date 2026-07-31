# SpinRate metadata architecture

`src/services/metadata` is an isolated, provider-agnostic foundation for music metadata. It is not wired into the current application, its Spotify API routes, Supabase data model, or UI. This initial layer makes no network requests.

## Design goals

- Give application code one normalized model for artists, albums, tracks, credits, labels, genres, styles, and external links.
- Keep external-provider response shapes at the provider boundary.
- Allow several providers to contribute metadata without coupling the product to any single service.
- Support detailed credits: one `Credit` contains multiple people, and each person can hold multiple roles.

## Directory layout

```text
metadata/
  models/       Provider-agnostic domain models and their barrel export
  providers/    Shared contract and provider-specific adapters
  MetadataService.ts
  index.ts      Public module entry point
```

## Models

Consumers should import normalized models from this module's `index.ts`, not from a provider. `Album` and `Track` use `Credit[]`; each credit has `people`, and each credited person has a flexible `roles` list. This supports combinations such as writer/producer, several mixers, or an unmapped provider role without adding fixed fields for each credit type.

## Provider responsibilities

Every provider implements `MetadataProvider`:

- `searchArtists` and `searchAlbums` convert source search results into normalized models.
- `getArtist` and `getAlbum` retrieve a single source record and normalize it.
- Providers own API authentication, request limits, raw response parsing, and source-specific identifier handling when those integrations are added.

The included MusicBrainz, Spotify, and Last.fm classes are placeholders. They intentionally throw a clear not-implemented error and make no API calls.

## MetadataService responsibilities

`MetadataService` currently registers providers and exposes them by stable ID. Future work can add provider selection, cross-provider search, matching, enrichment, merging, caching, retries, and field-precedence rules here. Keeping that orchestration out of UI and API route code prevents provider-specific coupling.

## Adding Discogs or another provider

1. Create `providers/DiscogsProvider.ts` implementing `MetadataProvider`.
2. Map Discogs responses into `Artist` and `Album` models; do not expose raw Discogs objects.
3. Add its export to `providers/index.ts`.
4. Register it when a future composition root creates `MetadataService`.
5. Define and test any source precedence or entity-matching rules in `MetadataService`, not in the provider or UI.

No current application feature should import this layer until an explicit integration task defines which providers, API boundaries, cache behavior, and metadata precedence rules are needed.
