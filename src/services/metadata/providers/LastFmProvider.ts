import type { Album, Artist } from "../models";
import type { MetadataProvider, MetadataSearchOptions, MetadataSearchResult } from "./MetadataProvider";

/**
 * Placeholder for a Last.fm-backed normalized metadata provider.
 *
 * Network access and response mapping are intentionally deferred.
 */
export class LastFmProvider implements MetadataProvider {
  readonly id = "lastfm";

  async searchArtists(_query: string, _options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>> {
    throw new Error("LastFmProvider is not implemented yet.");
  }

  async getArtist(_providerId: string): Promise<Artist | null> {
    throw new Error("LastFmProvider is not implemented yet.");
  }

  async searchAlbums(_query: string, _options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>> {
    throw new Error("LastFmProvider is not implemented yet.");
  }

  async getAlbum(_providerId: string): Promise<Album | null> {
    throw new Error("LastFmProvider is not implemented yet.");
  }
}
