import type { Album, Artist } from "../models";
import type { MetadataProvider, MetadataSearchOptions, MetadataSearchResult } from "./MetadataProvider";

/**
 * Placeholder for a Spotify-backed normalized metadata provider.
 *
 * It is separate from SpinRate's current Spotify API routes and performs no
 * network calls until a future integration explicitly wires it in.
 */
export class SpotifyProvider implements MetadataProvider {
  readonly id = "spotify";

  async searchArtists(_query: string, _options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>> {
    throw new Error("SpotifyProvider is not implemented yet.");
  }

  async getArtist(_providerId: string): Promise<Artist | null> {
    throw new Error("SpotifyProvider is not implemented yet.");
  }

  async searchAlbums(_query: string, _options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>> {
    throw new Error("SpotifyProvider is not implemented yet.");
  }

  async getAlbum(_providerId: string): Promise<Album | null> {
    throw new Error("SpotifyProvider is not implemented yet.");
  }
}
