import type { Album, Artist, ExternalLink, Genre, Label, Style, Track } from "./models";
import type { MetadataProvider, MetadataSearchOptions, MetadataSearchResult } from "./providers";

const DEFAULT_PRIMARY_PROVIDER_ID = "spotify";
const DEFAULT_ENRICHMENT_PROVIDER_IDS = ["musicbrainz"];

export interface MetadataLookupOptions {
  primaryProviderId?: string;
  enrichmentProviderIds?: string[];
}

const normalizeText = (value: string | undefined): string => (value || "")
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/gi, "")
  .toLowerCase();

const normalizeDateYear = (value: string | undefined): string => (value || "").slice(0, 4);

const mergeUniqueBy = <T>(left: T[], right: T[], key: (value: T) => string): T[] => {
  const merged: T[] = [];
  const seen = new Set<string>();

  for (const value of [...left, ...right]) {
    const normalizedKey = key(value);
    if (!normalizedKey || seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    merged.push(value);
  }

  return merged;
};

const mergeExternalLinks = (left: ExternalLink[], right: ExternalLink[]): ExternalLink[] => (
  mergeUniqueBy(left, right, (link) => link.url.toLowerCase())
);

const mergeGenres = (left: Genre[], right: Genre[]): Genre[] => (
  mergeUniqueBy(left, right, (genre) => normalizeText(genre.name))
);

const mergeStyles = (left: Style[], right: Style[]): Style[] => (
  mergeUniqueBy(left, right, (style) => normalizeText(style.name))
);

const mergeLabels = (left: Label[], right: Label[]): Label[] => (
  mergeUniqueBy(left, right, (label) => normalizeText(label.id || label.name))
);

const mergeArtists = (left: Artist[], right: Artist[]): Artist[] => {
  const rightByName = new Map(right.map((artist) => [normalizeText(artist.name), artist]));

  const mergedLeft = left.map((artist) => {
    const match = rightByName.get(normalizeText(artist.name));
    return match ? mergeArtist(artist, match) : artist;
  });

  const remaining = right.filter((artist) => !left.some((existing) => normalizeText(existing.name) === normalizeText(artist.name)));
  return [...mergedLeft, ...remaining];
};

const mergeTracks = (left: Track[], right: Track[]): Track[] => {
  if (left.length === 0) return right;
  if (right.length === 0) return left;

  const rightByPosition = new Map(right.map((track) => [String(track.position || 0), track]));
  return left.map((track) => {
    const positionKey = String(track.position || 0);
    const titleKey = normalizeText(track.title);
    const match = rightByPosition.get(positionKey)
      || right.find((candidate) => normalizeText(candidate.title) === titleKey);

    if (!match) return track;

    return {
      ...track,
      title: track.title || match.title,
      position: track.position || match.position,
      discNumber: track.discNumber || match.discNumber,
      durationMs: track.durationMs || match.durationMs,
      artists: mergeArtists(track.artists, match.artists),
      credits: track.credits.length ? track.credits : match.credits,
      genres: mergeGenres(track.genres, match.genres),
      styles: mergeStyles(track.styles, match.styles),
      externalLinks: mergeExternalLinks(track.externalLinks, match.externalLinks),
    };
  });
};

const mergeArtist = (primary: Artist, enrichment: Artist): Artist => ({
  ...primary,
  name: primary.name || enrichment.name,
  sortName: primary.sortName || enrichment.sortName,
  disambiguation: primary.disambiguation || enrichment.disambiguation,
  biography: primary.biography || enrichment.biography,
  imageUrl: primary.imageUrl || enrichment.imageUrl,
  genres: mergeGenres(primary.genres, enrichment.genres),
  styles: mergeStyles(primary.styles, enrichment.styles),
  externalLinks: mergeExternalLinks(primary.externalLinks, enrichment.externalLinks),
});

const mergeAlbum = (primary: Album, enrichment: Album): Album => ({
  ...primary,
  title: primary.title || enrichment.title,
  artists: mergeArtists(primary.artists, enrichment.artists),
  format: primary.format === "other" ? enrichment.format : primary.format,
  releaseDate: primary.releaseDate || enrichment.releaseDate,
  artworkUrl: primary.artworkUrl || enrichment.artworkUrl,
  runtimeMs: primary.runtimeMs || enrichment.runtimeMs,
  labels: primary.labels.length ? mergeLabels(primary.labels, enrichment.labels) : enrichment.labels,
  genres: mergeGenres(primary.genres, enrichment.genres),
  styles: mergeStyles(primary.styles, enrichment.styles),
  tracks: mergeTracks(primary.tracks, enrichment.tracks),
  credits: primary.credits.length ? primary.credits : enrichment.credits,
  externalLinks: mergeExternalLinks(primary.externalLinks, enrichment.externalLinks),
});

const artistScore = (left: Artist, right: Artist): number => {
  const leftName = normalizeText(left.name);
  const rightName = normalizeText(right.name);
  if (!leftName || !rightName) return 0;
  if (leftName === rightName) return 100;
  if (leftName.includes(rightName) || rightName.includes(leftName)) return 70;
  return 0;
};

const albumScore = (left: Album, right: Album): number => {
  const leftTitle = normalizeText(left.title);
  const rightTitle = normalizeText(right.title);
  if (!leftTitle || !rightTitle) return 0;

  let score = 0;
  if (leftTitle === rightTitle) {
    score += 100;
  } else if (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle)) {
    score += 60;
  }

  const leftArtists = new Set(left.artists.map((artist) => normalizeText(artist.name)).filter(Boolean));
  const rightArtists = right.artists.map((artist) => normalizeText(artist.name)).filter(Boolean);
  if (rightArtists.some((name) => leftArtists.has(name))) {
    score += 60;
  }

  const leftYear = normalizeDateYear(left.releaseDate);
  const rightYear = normalizeDateYear(right.releaseDate);
  if (leftYear && rightYear && leftYear === rightYear) {
    score += 10;
  }

  return score;
};

const findBestMatch = <T>(source: T, candidates: T[], score: (left: T, right: T) => number, threshold: number): T | null => {
  let bestMatch: T | null = null;
  let bestScore = threshold;

  for (const candidate of candidates) {
    const candidateScore = score(source, candidate);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestMatch = candidate;
    }
  }

  return bestMatch;
};

/**
 * Registry and future orchestration boundary for normalized metadata providers.
 *
 * This initial implementation manages provider registration only. Cross-source
 * search, entity matching, enrichment, caching, and precedence policies will
 * be introduced here without exposing provider details to application code.
 */
export class MetadataService {
  private readonly providers = new Map<string, MetadataProvider>();

  constructor(initialProviders: MetadataProvider[] = []) {
    initialProviders.forEach((provider) => this.registerProvider(provider));
  }

  /** Register or replace a provider using its stable provider key. */
  registerProvider(provider: MetadataProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Return a registered provider, if available. */
  getProvider(providerId: string): MetadataProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Return the registered provider keys without exposing the internal map. */
  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }

  async searchArtists(
    query: string,
    options?: MetadataSearchOptions,
    lookupOptions: MetadataLookupOptions = {}
  ): Promise<MetadataSearchResult<Artist>> {
    const primaryProvider = this.resolvePrimaryProvider(lookupOptions.primaryProviderId);
    const enrichmentProviders = this.resolveEnrichmentProviders(primaryProvider?.id, lookupOptions.enrichmentProviderIds);

    if (!primaryProvider && enrichmentProviders.length === 0) {
      return { items: [], hasMore: false };
    }

    if (!primaryProvider) {
      return enrichmentProviders[0].searchArtists(query, options);
    }

    const [primaryResult, ...enrichmentResults] = await Promise.all([
      primaryProvider.searchArtists(query, options),
      ...enrichmentProviders.map((provider) => provider.searchArtists(query, options)),
    ]);

    const items = primaryResult.items.map((artist) => enrichmentResults.reduce((currentArtist, result) => {
      const match = findBestMatch(currentArtist, result.items, artistScore, 90);
      return match ? mergeArtist(currentArtist, match) : currentArtist;
    }, artist));

    return { items, hasMore: primaryResult.hasMore };
  }

  async getArtist(providerEntityId: string, lookupOptions: MetadataLookupOptions = {}): Promise<Artist | null> {
    const primaryProvider = this.resolvePrimaryProvider(lookupOptions.primaryProviderId);
    const enrichmentProviders = this.resolveEnrichmentProviders(primaryProvider?.id, lookupOptions.enrichmentProviderIds);

    if (!primaryProvider && enrichmentProviders.length === 0) {
      return null;
    }

    if (!primaryProvider) {
      return enrichmentProviders[0].getArtist(providerEntityId);
    }

    const artist = await primaryProvider.getArtist(providerEntityId);
    if (!artist) return null;

    let mergedArtist = artist;
    for (const provider of enrichmentProviders) {
      const searchResult = await provider.searchArtists(artist.name, { limit: 10 });
      const match = findBestMatch(mergedArtist, searchResult.items, artistScore, 90);
      if (!match) continue;

      const enrichedArtist = await provider.getArtist(match.id) || match;
      mergedArtist = mergeArtist(mergedArtist, enrichedArtist);
    }

    return mergedArtist;
  }

  async searchAlbums(
    query: string,
    options?: MetadataSearchOptions,
    lookupOptions: MetadataLookupOptions = {}
  ): Promise<MetadataSearchResult<Album>> {
    const primaryProvider = this.resolvePrimaryProvider(lookupOptions.primaryProviderId);
    const enrichmentProviders = this.resolveEnrichmentProviders(primaryProvider?.id, lookupOptions.enrichmentProviderIds);

    if (!primaryProvider && enrichmentProviders.length === 0) {
      return { items: [], hasMore: false };
    }

    if (!primaryProvider) {
      return enrichmentProviders[0].searchAlbums(query, options);
    }

    const [primaryResult, ...enrichmentResults] = await Promise.all([
      primaryProvider.searchAlbums(query, options),
      ...enrichmentProviders.map((provider) => provider.searchAlbums(query, options)),
    ]);

    const items = primaryResult.items.map((album) => enrichmentResults.reduce((currentAlbum, result) => {
      const match = findBestMatch(currentAlbum, result.items, albumScore, 100);
      return match ? mergeAlbum(currentAlbum, match) : currentAlbum;
    }, album));

    return { items, hasMore: primaryResult.hasMore };
  }

  async getAlbum(providerEntityId: string, lookupOptions: MetadataLookupOptions = {}): Promise<Album | null> {
    const primaryProvider = this.resolvePrimaryProvider(lookupOptions.primaryProviderId);
    const enrichmentProviders = this.resolveEnrichmentProviders(primaryProvider?.id, lookupOptions.enrichmentProviderIds);

    if (!primaryProvider && enrichmentProviders.length === 0) {
      return null;
    }

    if (!primaryProvider) {
      return enrichmentProviders[0].getAlbum(providerEntityId);
    }

    const album = await primaryProvider.getAlbum(providerEntityId);
    if (!album) return null;

    let mergedAlbum = album;
    for (const provider of enrichmentProviders) {
      const searchQuery = [album.artists.map((artist) => artist.name).join(" "), album.title].filter(Boolean).join(" ");
      const searchResult = await provider.searchAlbums(searchQuery, { limit: 10 });
      const match = findBestMatch(mergedAlbum, searchResult.items, albumScore, 100);
      if (!match) continue;

      const enrichedAlbum = await provider.getAlbum(match.id) || match;
      mergedAlbum = mergeAlbum(mergedAlbum, enrichedAlbum);
    }

    return mergedAlbum;
  }

  private resolvePrimaryProvider(providerId?: string): MetadataProvider | undefined {
    const preferredProviderId = providerId
      || (this.providers.has(DEFAULT_PRIMARY_PROVIDER_ID) ? DEFAULT_PRIMARY_PROVIDER_ID : this.getProviderIds()[0]);
    return preferredProviderId ? this.getProvider(preferredProviderId) : undefined;
  }

  private resolveEnrichmentProviders(primaryProviderId: string | undefined, providerIds?: string[]): MetadataProvider[] {
    const preferredProviderIds = providerIds || DEFAULT_ENRICHMENT_PROVIDER_IDS;
    return preferredProviderIds
      .filter((providerId) => providerId && providerId !== primaryProviderId)
      .map((providerId) => this.getProvider(providerId))
      .filter((provider): provider is MetadataProvider => Boolean(provider));
  }
}
