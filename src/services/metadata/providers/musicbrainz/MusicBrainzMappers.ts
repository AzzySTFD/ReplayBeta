import type { Album, AlbumFormat, Artist, ExternalLink, Genre, Label, Style, Track } from "../../models";
import type {
  MusicBrainzArtist,
  MusicBrainzArtistCredit,
  MusicBrainzGenre,
  MusicBrainzLabel,
  MusicBrainzRelease,
  MusicBrainzReleaseGroup,
  MusicBrainzTag,
  MusicBrainzTrack,
  MusicBrainzUrlRelation,
} from "./MusicBrainzTypes";

const MUSICBRAINZ_WEB_URL = "https://musicbrainz.org";

const toGenre = (genre: MusicBrainzGenre): Genre | null => {
  if (!genre.name) return null;
  return { id: genre.id, name: genre.name };
};

const toStyle = (tag: MusicBrainzTag): Style | null => {
  if (!tag.name) return null;
  return { name: tag.name };
};

const compact = <T>(values: Array<T | null | undefined>): T[] => values.filter((value): value is T => Boolean(value));

/** Convert MusicBrainz URL relationships into provider-neutral links. */
export const mapExternalLinks = (
  entityType: "artist" | "release" | "release-group" | "label",
  mbid: string | undefined,
  relations: MusicBrainzUrlRelation[] = []
): ExternalLink[] => {
  const links: ExternalLink[] = mbid
    ? [{ label: "MusicBrainz", url: `${MUSICBRAINZ_WEB_URL}/${entityType}/${mbid}`, provider: "musicbrainz" }]
    : [];

  for (const relation of relations) {
    const url = relation.url?.resource;
    if (!url || links.some((link) => link.url === url)) continue;
    links.push({ label: relation.type || "External link", url });
  }

  return links;
};

/** Convert a MusicBrainz artist object into SpinRate's normalized Artist. */
export const mapArtist = (source: MusicBrainzArtist): Artist => ({
  id: source.id || "",
  name: source.name || "",
  sortName: source["sort-name"],
  disambiguation: source.disambiguation || undefined,
  genres: compact((source.genres || []).map(toGenre)),
  styles: compact((source.tags || []).map(toStyle)),
  externalLinks: mapExternalLinks("artist", source.id, source.relations),
});

/** Convert MusicBrainz artist credits into normalized artist references. */
export const mapArtistCredits = (credits: MusicBrainzArtistCredit[] = []): Artist[] => compact(
  credits.map((credit) => {
    const artist = mapArtist(credit.artist || { name: credit.name });
    return artist.name ? artist : null;
  })
);

/** Convert a MusicBrainz label object into SpinRate's normalized Label. */
export const mapLabel = (source: MusicBrainzLabel): Label | null => {
  if (!source.name) return null;
  return {
    id: source.id,
    name: source.name,
    externalLinks: mapExternalLinks("label", source.id, source.relations),
  };
};

/** Normalize MusicBrainz release-group type fields to SpinRate's AlbumFormat. */
export const mapAlbumFormat = (source?: MusicBrainzReleaseGroup): AlbumFormat => {
  const secondaryTypes = new Set((source?.["secondary-types"] || []).map((type) => type.toLowerCase()));
  if (secondaryTypes.has("compilation")) return "compilation";
  if (secondaryTypes.has("live")) return "live";
  if (secondaryTypes.has("mixtape/street")) return "mixtape";
  if (secondaryTypes.has("soundtrack")) return "soundtrack";

  switch (source?.["primary-type"]?.toLowerCase()) {
    case "album": return "album";
    case "ep": return "ep";
    case "single": return "single";
    default: return "other";
  }
};

/** Convert a MusicBrainz track/recording pair into SpinRate's normalized Track. */
export const mapTrack = (source: MusicBrainzTrack, discNumber?: number): Track => {
  const recording = source.recording;
  const parsedPosition = Number(source.number);
  const parsedDuration = Number(source.length);

  return {
    id: recording?.id || source.id || "",
    title: source.title || recording?.title || "",
    position: Number.isFinite(parsedPosition) ? parsedPosition : undefined,
    discNumber,
    durationMs: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
    artists: mapArtistCredits(source["artist-credit"] || recording?.["artist-credit"]),
    credits: [],
    genres: [],
    styles: [],
    externalLinks: recording?.id
      ? [{ label: "MusicBrainz", url: `${MUSICBRAINZ_WEB_URL}/recording/${recording.id}`, provider: "musicbrainz" }]
      : [],
  };
};

/** Convert a MusicBrainz release group plus optional representative release into a normalized Album. */
export const mapAlbum = (group: MusicBrainzReleaseGroup, release?: MusicBrainzRelease): Album => {
  const tracks = (release?.media || []).flatMap((medium, mediumIndex) => (
    (medium.tracks || []).map((track) => mapTrack(track, Number(medium.position) || mediumIndex + 1))
  ));
  const runtimeMs = tracks.reduce((total, track) => total + (track.durationMs || 0), 0);
  const labels = compact((release?.["label-info"] || []).map((entry) => mapLabel(entry.label || {})));
  const genres = compact([...(group.genres || []), ...(release?.genres || [])].map(toGenre));
  const styles = compact([...(group.tags || []), ...(release?.tags || [])].map(toStyle));
  const releaseGroupId = group.id || release?.["release-group"]?.id || "";

  return {
    id: releaseGroupId,
    title: group.title || release?.title || "",
    artists: mapArtistCredits(group["artist-credit"] || release?.["artist-credit"]),
    format: mapAlbumFormat(group),
    releaseDate: group["first-release-date"] || release?.date || undefined,
    runtimeMs: runtimeMs || undefined,
    labels,
    genres,
    styles,
    tracks,
    credits: [],
    externalLinks: mapExternalLinks("release-group", releaseGroupId, group.relations || release?.relations),
  };
};
