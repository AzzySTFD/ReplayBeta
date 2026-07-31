import type { ExternalLink } from "./ExternalLink";
import type { Genre } from "./Genre";
import type { Style } from "./Style";

/**
 * A normalized music artist, group, or other credited musical act.
 *
 * It represents SpinRate's metadata shape rather than the response from any
 * one provider.
 */
export interface Artist {
  /** Stable identifier assigned by the metadata layer. */
  id: string;
  /** Primary display name. */
  name: string;
  /** Alternate sorting name when supplied by a provider. */
  sortName?: string;
  /** Short context used to distinguish similarly named artists. */
  disambiguation?: string;
  /** Optional biography or summary text. */
  biography?: string;
  /** Preferred artist image URL. */
  imageUrl?: string;
  /** Broad musical classifications. */
  genres: Genre[];
  /** Specific musical classifications. */
  styles: Style[];
  /** Provider-neutral outbound links. */
  externalLinks: ExternalLink[];
}
