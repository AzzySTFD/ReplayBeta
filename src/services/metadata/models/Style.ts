/**
 * A more specific musical classification than a Genre.
 *
 * Styles allow the metadata layer to preserve useful provider detail without
 * forcing clients to consume provider-specific response structures.
 */
export interface Style {
  /** Stable normalized identifier when one is available. */
  id?: string;
  /** Display name, for example "Dream Pop". */
  name: string;
}
