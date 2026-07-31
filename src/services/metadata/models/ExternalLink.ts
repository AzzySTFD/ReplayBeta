/**
 * A canonical outbound URL associated with a metadata entity.
 *
 * Links are provider-agnostic so consumers do not need to understand a
 * provider's native URL fields.
 */
export interface ExternalLink {
  /** Human-readable destination, such as "Official site" or "Spotify". */
  label: string;
  /** Absolute destination URL. */
  url: string;
  /** Optional source or service that owns the link. */
  provider?: string;
}
