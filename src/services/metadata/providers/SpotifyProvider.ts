import type { Album, Artist } from "../models";
import type { MetadataProvider, MetadataSearchOptions, MetadataSearchResult } from "./MetadataProvider";

type FetchFunction = typeof fetch;

type SpotifyRequestFunction = (path: string) => Promise<unknown | null>;

export interface SpotifyProviderOptions {
  /** Optional full request delegate for environments that already wrap Spotify auth. */
  requestJson?: SpotifyRequestFunction;
  /** Overrides the Spotify REST API root when using the built-in fetch client. */
  baseUrl?: string;
  /** Injected fetch implementation for tests. */
  fetchFn?: FetchFunction;
  /** Static access token for the built-in fetch client. */
  accessToken?: string;
  /** Async access-token loader for the built-in fetch client. */
  accessTokenProvider?: () => Promise<string | null>;
  /** Market forwarded to Spotify album and search requests. */
  market?: string;
}

type SpotifyImage = { url?: string; width?: number };
type SpotifyExternalUrls = { spotify?: string };
type SpotifyArtist = {
  id?: string;
  name?: string;
  genres?: string[];
  images?: SpotifyImage[];
  external_urls?: SpotifyExternalUrls;
};
type SpotifyTrack = {
  id?: string;
  name?: string;
  track_number?: number;
  disc_number?: number;
  duration_ms?: number;
  artists?: SpotifyArtist[];
  external_urls?: SpotifyExternalUrls;
};
type SpotifyAlbum = {
  id?: string;
  name?: string;
  album_type?: string;
  release_date?: string;
  images?: SpotifyImage[];
  artists?: SpotifyArtist[];
  total_tracks?: number;
  label?: string;
  genres?: string[];
  tracks?: { total?: number; items?: SpotifyTrack[] };
  external_urls?: SpotifyExternalUrls;
};

const DEFAULT_BASE_URL = "https://api.spotify.com/v1";
const DEFAULT_MARKET = "US";

const compact = <T>(values: Array<T | null | undefined>): T[] => values.filter((value): value is T => Boolean(value));

const normalizeAlbumFormat = (albumType?: string): Album["format"] => {
  switch ((albumType || "").toLowerCase()) {
    case "album": return "album";
    case "single": return "single";
    case "compilation": return "compilation";
    case "ep": return "ep";
    default: return "other";
  }
};

const pickImageUrl = (images: SpotifyImage[] = []): string | undefined => {
  const preferred = images.find((image) => Number(image.width || 0) >= 300)?.url;
  return preferred || images[0]?.url || undefined;
};

const mapArtist = (artist: SpotifyArtist): Artist => ({
  id: artist.id || "",
  name: artist.name || "",
  imageUrl: pickImageUrl(artist.images),
  genres: compact((artist.genres || []).map((name) => (name ? { name } : null))),
  styles: [],
  externalLinks: artist.external_urls?.spotify
    ? [{ label: "Spotify", url: artist.external_urls.spotify, provider: "spotify" }]
    : [],
});

const mapTrack = (track: SpotifyTrack) => ({
  id: track.id || "",
  title: track.name || "",
  position: Number.isFinite(track.track_number) ? track.track_number : undefined,
  discNumber: Number.isFinite(track.disc_number) ? track.disc_number : undefined,
  durationMs: Number.isFinite(track.duration_ms) ? track.duration_ms : undefined,
  artists: compact((track.artists || []).map((artist) => (artist.name ? mapArtist(artist) : null))),
  credits: [],
  genres: [],
  styles: [],
  externalLinks: track.external_urls?.spotify
    ? [{ label: "Spotify", url: track.external_urls.spotify, provider: "spotify" }]
    : [],
});

const mapAlbum = (album: SpotifyAlbum): Album => {
  const tracks = compact((album.tracks?.items || []).map((track) => (track.name ? mapTrack(track) : null)));
  const totalTracks = Number(album.total_tracks ?? album.tracks?.total ?? tracks.length ?? 0);
  const hasCompleteTrackList = totalTracks > 0 && tracks.length >= totalTracks;

  return {
    id: album.id || "",
    title: album.name || "",
    artists: compact((album.artists || []).map((artist) => (artist.name ? mapArtist(artist) : null))),
    format: normalizeAlbumFormat(album.album_type),
    releaseDate: album.release_date || undefined,
    artworkUrl: pickImageUrl(album.images),
    runtimeMs: hasCompleteTrackList ? tracks.reduce((total, track) => total + (track.durationMs || 0), 0) : undefined,
    labels: album.label ? [{ name: album.label }] : [],
    genres: compact((album.genres || []).map((name) => (name ? { name } : null))),
    styles: [],
    tracks,
    credits: [],
    externalLinks: album.external_urls?.spotify
      ? [{ label: "Spotify", url: album.external_urls.spotify, provider: "spotify" }]
      : [],
  };
};

export class SpotifyProvider implements MetadataProvider {
  readonly id = "spotify";
  private readonly requestJson?: SpotifyRequestFunction;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFunction;
  private readonly accessToken?: string;
  private readonly accessTokenProvider?: () => Promise<string | null>;
  private readonly market: string;

  constructor(options: SpotifyProviderOptions = {}) {
    this.requestJson = options.requestJson;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.accessToken = options.accessToken;
    this.accessTokenProvider = options.accessTokenProvider;
    this.market = options.market || DEFAULT_MARKET;
  }

  async searchArtists(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>> {
    const result = await this.getJson<{ artists?: { items?: SpotifyArtist[]; total?: number } }>("/search", {
      q: this.requireQuery(query),
      type: "artist",
      ...this.toSearchParams(options),
      market: this.market,
    });
    const items = compact((result?.artists?.items || []).map((artist) => (artist.name ? mapArtist(artist) : null)));
    return this.toSearchResult(items, result?.artists?.total, options);
  }

  async getArtist(providerId: string): Promise<Artist | null> {
    const artist = await this.getJson<SpotifyArtist>(`/artists/${encodeURIComponent(this.requireProviderId(providerId))}`);
    return artist?.name ? mapArtist(artist) : null;
  }

  async searchAlbums(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>> {
    const result = await this.getJson<{ albums?: { items?: SpotifyAlbum[]; total?: number } }>("/search", {
      q: this.requireQuery(query),
      type: "album",
      ...this.toSearchParams(options),
      market: this.market,
    });
    const items = compact((result?.albums?.items || []).map((album) => (album.name ? mapAlbum(album) : null)));
    return this.toSearchResult(items, result?.albums?.total, options);
  }

  async getAlbum(providerId: string): Promise<Album | null> {
    const album = await this.getJson<SpotifyAlbum>(`/albums/${encodeURIComponent(this.requireProviderId(providerId))}`, {
      market: this.market,
    });
    return album?.name ? mapAlbum(album) : null;
  }

  private async getJson<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
    if (this.requestJson) {
      const query = new URLSearchParams(params).toString();
      return this.requestJson(query ? `${path}?${query}` : path) as Promise<T | null>;
    }

    const accessToken = this.accessToken || await this.accessTokenProvider?.();
    if (!accessToken) {
      throw new Error("SpotifyProvider requires requestJson, accessToken, or accessTokenProvider.");
    }

    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await this.fetchFn(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Spotify request failed with ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }

  private toSearchParams(options: MetadataSearchOptions = {}): Record<string, string> {
    const limit = Math.min(Math.max(Math.floor(options.limit || 25), 1), 50);
    const offset = Math.max(Math.floor(options.offset || 0), 0);
    return { limit: String(limit), offset: String(offset) };
  }

  private toSearchResult<T>(items: T[], count: number | undefined, options: MetadataSearchOptions = {}): MetadataSearchResult<T> {
    const offset = Math.max(Math.floor(options.offset || 0), 0);
    return { items, hasMore: typeof count === "number" ? offset + items.length < count : false };
  }

  private requireProviderId(providerId: string): string {
    const normalized = providerId.trim();
    if (!normalized) throw new Error("A Spotify provider ID is required.");
    return normalized;
  }

  private requireQuery(query: string): string {
    const normalized = query.trim();
    if (!normalized) throw new Error("A Spotify search query is required.");
    return normalized;
  }
}
