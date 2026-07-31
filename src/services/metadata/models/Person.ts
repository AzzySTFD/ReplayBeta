import type { ExternalLink } from "./ExternalLink";

/**
 * A person credited for creative or technical work.
 *
 * People are separate from Artist so an individual can be credited even when
 * they are not a primary performing artist.
 */
export interface Person {
  /** Stable normalized identifier when one is available. */
  id?: string;
  /** Credited display name. */
  name: string;
  /** Optional external references for the person. */
  externalLinks?: ExternalLink[];
}
