import type { Artist } from "./Artist";
import type { Credit } from "./Credit";
import type { ExternalLink } from "./ExternalLink";
import type { Genre } from "./Genre";
import type { Style } from "./Style";

/**
 * A normalized track belonging to an album or release.
 *
 * Credits can capture every contributor and role without coupling track data
 * to an individual provider's credit response format.
 */
export interface Track {
  /** Stable identifier assigned by the metadata layer. */
  id: string;
  /** Track title. */
  title: string;
  /** One-based track number within its disc. */
  position?: number;
  /** One-based disc number for multi-disc releases. */
  discNumber?: number;
  /** Playback duration in milliseconds. */
  durationMs?: number;
  /** Performing or featured artists associated with the track. */
  artists: Artist[];
  /** Creative and technical attributions for this track. */
  credits: Credit[];
  /** Broad musical classifications that specifically apply to this track. */
  genres: Genre[];
  /** Specific musical classifications that specifically apply to this track. */
  styles: Style[];
  /** Provider-neutral outbound links. */
  externalLinks: ExternalLink[];
}
