/** Internal MusicBrainz JSON shapes used only by the MusicBrainz provider. */
export interface MusicBrainzGenre {
  id?: string;
  name?: string;
}

export interface MusicBrainzTag {
  name?: string;
}

export interface MusicBrainzUrlRelation {
  type?: string;
  url?: { resource?: string };
}

export interface MusicBrainzArtist {
  id?: string;
  name?: string;
  "sort-name"?: string;
  disambiguation?: string;
  genres?: MusicBrainzGenre[];
  tags?: MusicBrainzTag[];
  relations?: MusicBrainzUrlRelation[];
}

export interface MusicBrainzArtistCredit {
  name?: string;
  artist?: MusicBrainzArtist;
}

export interface MusicBrainzLabel {
  id?: string;
  name?: string;
  relations?: MusicBrainzUrlRelation[];
}

export interface MusicBrainzLabelInfo {
  label?: MusicBrainzLabel;
}

export interface MusicBrainzRecording {
  id?: string;
  title?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzTrack {
  id?: string;
  title?: string;
  number?: string;
  length?: number | string;
  recording?: MusicBrainzRecording;
  "artist-credit"?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzMedium {
  position?: number | string;
  tracks?: MusicBrainzTrack[];
}

export interface MusicBrainzReleaseGroup {
  id?: string;
  title?: string;
  "first-release-date"?: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "artist-credit"?: MusicBrainzArtistCredit[];
  genres?: MusicBrainzGenre[];
  tags?: MusicBrainzTag[];
  relations?: MusicBrainzUrlRelation[];
}

export interface MusicBrainzRelease {
  id?: string;
  title?: string;
  date?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
  "label-info"?: MusicBrainzLabelInfo[];
  "release-group"?: MusicBrainzReleaseGroup;
  media?: MusicBrainzMedium[];
  genres?: MusicBrainzGenre[];
  tags?: MusicBrainzTag[];
  relations?: MusicBrainzUrlRelation[];
}

export interface MusicBrainzArtistSearchResponse {
  count?: number;
  artists?: MusicBrainzArtist[];
}

export interface MusicBrainzReleaseGroupSearchResponse {
  count?: number;
  "release-groups"?: MusicBrainzReleaseGroup[];
}

export interface MusicBrainzReleaseBrowseResponse {
  releases?: MusicBrainzRelease[];
}
