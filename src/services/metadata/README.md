# SpinRate metadata architecture

`src/services/metadata` is a provider-agnostic foundation for music metadata. It now supports Spotify as the primary provider and MusicBrainz as an enrichment source for normalized album and artist lookups. The current UI still consumes the existing Spotify-shaped API payloads, while server handlers selectively enrich those payloads with MusicBrainz details.

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

`MusicBrainzProvider` searches artists and release groups, looks up artists by MBID, and enriches release-group lookups with a representative official release for labels and tracks. It returns only normalized models.

The provider identifies itself with a User-Agent and enforces MusicBrainz's one-request-per-second guidance by default. This is request throttling only; it does not cache data.

`SpotifyProvider` normalizes Spotify artist, album, and track responses. It can use either an injected request delegate or a built-in authenticated fetch client. `LastFmProvider` remains a placeholder.

## MetadataService responsibilities

`MetadataService` still registers providers by stable ID, and it now also orchestrates cross-provider artist and album lookups. By default it treats Spotify as the primary source, matches MusicBrainz records by normalized artist/title heuristics, and merges enrichment fields such as labels, genres, styles, runtime, and provider links without replacing Spotify identifiers or artwork.

The active Spotify album-detail handlers also use a small server-side bridge that applies the same enrichment idea to the existing UI contract. The response shape remains unchanged for the frontend: Spotify fields such as `artist`, `artwork_url`, `release_year`, `album_type`, `tracks`, and `runtime_ms` are preserved while MusicBrainz fills gaps like labels, genres, and runtime when Spotify does not provide them.

## Adding Discogs or another provider

1. Create `providers/DiscogsProvider.ts` implementing `MetadataProvider`.
2. Map Discogs responses into `Artist` and `Album` models; do not expose raw Discogs objects.
3. Add its export to `providers/index.ts`.
4. Register it when a composition root creates `MetadataService`.
5. Define and test any source precedence or entity-matching rules in `MetadataService`, not in the provider or UI.
