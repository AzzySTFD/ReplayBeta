import type { ExternalLink } from "./ExternalLink";

/**
 * A record label or imprint associated with an album.
 */
export interface Label {
  /** Stable normalized identifier when one is available. */
  id?: string;
  /** Label or imprint name. */
  name: string;
  /** Optional external references for the label. */
  externalLinks?: ExternalLink[];
}
