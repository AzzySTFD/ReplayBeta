import type { Person } from "./Person";

/**
 * A role held by a person in relation to an album or track.
 *
 * The union keeps common roles discoverable while allowing future providers
 * to retain roles that do not fit a fixed schema.
 */
export type CreditRole =
  | "writer"
  | "composer"
  | "lyricist"
  | "producer"
  | "co-producer"
  | "executive-producer"
  | "mixer"
  | "mastering-engineer"
  | "recording-engineer"
  | "engineer"
  | "performer"
  | "featured-performer"
  | "arranger"
  | "artwork"
  | "other";

/**
 * Connects one person to one or more roles within a Credit.
 *
 * A single person can, for example, be both producer and mixer, while a
 * single Credit can include several people with different role sets.
 */
export interface CreditedPerson {
  /** The individual receiving credit. */
  person: Person;
  /** One or more normalized roles held by that person. */
  roles: CreditRole[];
  /** Provider wording for a role that is represented as `other`. */
  roleDetail?: string;
}

/**
 * Flexible attribution for an album or track.
 *
 * Credits intentionally avoid fixed producer/mixer/mastering fields so they
 * can represent multiple contributors and any role supplied by future
 * metadata providers.
 */
export interface Credit {
  /** People and their roles in this attribution. */
  people: CreditedPerson[];
  /** Optional note such as a version, disc, or source annotation. */
  note?: string;
}
