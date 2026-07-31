/**
 * A broad musical category used to group artists, albums, or tracks.
 *
 * Genres are normalized by name rather than tied to a particular provider's
 * taxonomy or identifier.
 */
export interface Genre {
  /** Stable normalized identifier when one is available. */
  id?: string;
  /** Display name, for example "Alternative Rock". */
  name: string;
}
