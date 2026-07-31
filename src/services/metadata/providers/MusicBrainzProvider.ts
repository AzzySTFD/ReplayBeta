import type { Album, Artist } from "../models";
import type { MetadataProvider, MetadataSearchOptions, MetadataSearchResult } from "./MetadataProvider";
import { mapAlbum, mapArtist } from "./musicbrainz/MusicBrainzMappers";
import type {
  MusicBrainzArtist,
  MusicBrainzArtistSearchResponse,
  MusicBrainzRelease,
  MusicBrainzReleaseBrowseResponse,
  MusicBrainzReleaseGroup,
  MusicBrainzReleaseGroupSearchResponse,
} from "./musicbrainz/MusicBrainzTypes";

const DEFAULT_BASE_URL = "https://musicbrainz.org/ws/2";
const DEFAULT_USER_AGENT = "SpinRate/0.1.0 (metadata provider)";

type FetchFunction = typeof fetch;

export interface MusicBrainzProviderOptions {
  /** Overrides the API root; useful for tests or a future server-side proxy. */
  baseUrl?: string;
  /** Injects fetch so tests do not make network requests. */
  fetchFn?: FetchFunction;
  /** Identifies this client to MusicBrainz as requested by its API policy. */
  userAgent?: string;
  /** Minimum delay between requests. Defaults to MusicBrainz's one-second policy. */
  minRequestIntervalMs?: number;
}

/** Error raised when MusicBrainz cannot fulfill a non-not-found request. */
export class MusicBrainzRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MusicBrainzRequestError";
  }
}

/**
 * MusicBrainz-backed provider that returns SpinRate's normalized metadata.
 *
 * Searches use release groups because they best represent one logical album
 * for a review. Album lookup enriches that group with one representative
 * official release for track and label data.
 */
export class MusicBrainzProvider implements MetadataProvider {
  readonly id = "musicbrainz";
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFunction;
  private readonly userAgent: string;
  private readonly minRequestIntervalMs: number;
  private nextRequestAt = 0;

  constructor(options: MusicBrainzProviderOptions = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    this.minRequestIntervalMs = Math.max(options.minRequestIntervalMs ?? 1000, 0);
  }

  async searchArtists(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>> {
    const result = await this.getJson<MusicBrainzArtistSearchResponse>("artist", {
      query: this.requireQuery(query),
      ...this.toSearchParams(options),
    });
    const items = (result?.artists || []).map(mapArtist).filter((artist) => Boolean(artist.id && artist.name));
    return this.toSearchResult(items, result?.count, options);
  }

  /** Singular convenience alias retained for provider consumers. */
  async searchArtist(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Artist>> {
    return this.searchArtists(query, options);
  }

  async getArtist(mbid: string): Promise<Artist | null> {
    const artist = await this.getJson<MusicBrainzArtist>(`artist/${this.requireMbid(mbid)}`, {
      inc: "genres+tags+url-rels",
    });
    return artist ? mapArtist(artist) : null;
  }

  async searchAlbums(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>> {
    const result = await this.getJson<MusicBrainzReleaseGroupSearchResponse>("release-group", {
      query: this.requireQuery(query),
      ...this.toSearchParams(options),
    });
    const items = (result?.["release-groups"] || []).map((group) => mapAlbum(group)).filter((album) => Boolean(album.id && album.title));
    return this.toSearchResult(items, result?.count, options);
  }

  /** Singular convenience alias retained for provider consumers. */
  async searchAlbum(query: string, options?: MetadataSearchOptions): Promise<MetadataSearchResult<Album>> {
    return this.searchAlbums(query, options);
  }

  async getAlbum(mbid: string): Promise<Album | null> {
    const normalizedMbid = this.requireMbid(mbid);
    const group = await this.getJson<MusicBrainzReleaseGroup>(`release-group/${normalizedMbid}`, {
      inc: "artist-credits+genres+tags+url-rels",
    });

    if (group) {
      const release = await this.getRepresentativeRelease(normalizedMbid);
      return mapAlbum(group, release || undefined);
    }

    const release = await this.getJson<MusicBrainzRelease>(`release/${normalizedMbid}`, {
      inc: "artist-credits+labels+recordings+release-groups+media+genres+tags+url-rels",
    });
    if (!release) return null;

    return mapAlbum(release["release-group"] || { id: release.id, title: release.title }, release);
  }

  private async getRepresentativeRelease(releaseGroupMbid: string): Promise<MusicBrainzRelease | null> {
    const result = await this.getJson<MusicBrainzReleaseBrowseResponse>("release", {
      "release-group": releaseGroupMbid,
      status: "official",
      limit: "25",
      inc: "artist-credits+labels+recordings+release-groups+media+genres+tags+url-rels",
    });
    const releases = result?.releases || [];
    if (releases.length === 0) return null;

    return [...releases].sort((left, right) => (left.date || "9999-99-99").localeCompare(right.date || "9999-99-99"))[0];
  }

  private async getJson<T>(path: string, params: Record<string, string>): Promise<T | null> {
    const url = new URL(`${this.baseUrl}/${path}`);
    Object.entries({ ...params, fmt: "json" }).forEach(([key, value]) => url.searchParams.set(key, value));

    await this.waitForRequestSlot();
    const response = await this.fetchFn(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new MusicBrainzRequestError(`MusicBrainz request failed with ${response.status}.`, response.status);
    }

    return response.json() as Promise<T>;
  }

  private async waitForRequestSlot(): Promise<void> {
    const now = Date.now();
    const waitMs = Math.max(this.nextRequestAt - now, 0);
    this.nextRequestAt = Math.max(this.nextRequestAt, now) + this.minRequestIntervalMs;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  private toSearchParams(options: MetadataSearchOptions = {}): Record<string, string> {
    const limit = Math.min(Math.max(Math.floor(options.limit || 25), 1), 100);
    const offset = Math.max(Math.floor(options.offset || 0), 0);
    return { limit: String(limit), offset: String(offset) };
  }

  private toSearchResult<T>(items: T[], count: number | undefined, options: MetadataSearchOptions = {}): MetadataSearchResult<T> {
    const offset = Math.max(Math.floor(options.offset || 0), 0);
    return { items, hasMore: typeof count === "number" ? offset + items.length < count : false };
  }

  private requireQuery(query: string): string {
    const normalized = query.trim();
    if (!normalized) throw new Error("A MusicBrainz search query is required.");
    return normalized;
  }

  private requireMbid(mbid: string): string {
    const normalized = mbid.trim();
    if (!normalized) throw new Error("A MusicBrainz ID is required.");
    return normalized;
  }
}
