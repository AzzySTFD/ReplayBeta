import type { Artist } from "./Artist";
import type { Credit } from "./Credit";
import type { ExternalLink } from "./ExternalLink";
import type { Genre } from "./Genre";
import type { Label } from "./Label";
import type { Style } from "./Style";
import type { Track } from "./Track";

/**
 * The broad kind of release represented by an Album.
 *
 * Providers may classify releases differently, so `other` preserves an
 * unmapped type without forcing the application to guess.
 */
export type AlbumFormat =
  | "album"
  | "lp"
  | "ep"
  | "single"
  | "live"
  | "compilation"
  | "mixtape"
  | "soundtrack"
  | "other";

/**
 * A normalized album or other music release.
 *
 * The model describes the shape consumed by SpinRate and deliberately avoids
 * mirroring MusicBrainz, Spotify, Last.fm, or any other provider response.
 */
export interface Album {
  /** Stable identifier assigned by the metadata layer. */
  id: string;
  /** Release title. */
  title: string;
  /** Primary and featured artists associated with the release. */
  artists: Artist[];
  /** Release format or best normalized classification. */
  format: AlbumFormat;
  /** ISO 8601 release date when known. */
  releaseDate?: string;
  /** Cover-art URL selected for product display. */
  artworkUrl?: string;
  /** Total runtime in milliseconds when it can be established. */
  runtimeMs?: number;
  /** Labels or imprints associated with the release. */
  labels: Label[];
  /** Broad musical classifications. */
  genres: Genre[];
  /** Specific musical classifications. */
  styles: Style[];
  /** Ordered track list when a provider has supplied it. */
  tracks: Track[];
  /** Album-wide creative and technical attributions. */
  credits: Credit[];
  /** Provider-neutral outbound links. */
  externalLinks: ExternalLink[];
}
