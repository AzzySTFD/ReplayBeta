import type { Album, Artist } from "../models";

/**
 * A provider-owned search result before MetadataService applies any future
 * cross-provider matching or ranking rules.
 */
export interface MetadataSearchResult<T> {
  /** Normalized matches returned by this provider. */
  items: T[];
  /** Whether the provider may have additional results. */
  hasMore: boolean;
}

/**
 * Common optional controls for normalized metadata searches.
 */
export interface MetadataSearchOptions {
  /** Maximum number of results requested from a provider. */
  limit?: number;
  /** Zero-based result offset when a provider supports pagination. */
  offset?: number;
}

/**
 * Contract implemented by every metadata provider.
 *
 * Implementations translate provider responses into normalized Artist and
 * Album models. They must not expose raw provider response shapes to callers.
 */
export interface MetadataProvider {
  /** Stable key used by MetadataService to address this provider. */
  readonly id: string;

  /** Search the provider for normalized artists. */
  searchArtists(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>>;
  /** Retrieve one normalized artist by that provider's identifier. */
  getArtist(providerId: string): Promise<Artist | null>;
  /** Search the provider for normalized albums. */
  searchAlbums(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>>;
  /** Retrieve one normalized album by that provider's identifier. */
  getAlbum(providerId: string): Promise<Album | null>;
}
