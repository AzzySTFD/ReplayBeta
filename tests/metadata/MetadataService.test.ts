import assert from "node:assert/strict";
import test from "node:test";
import { MetadataService } from "../../src/services/metadata/MetadataService";
import type { Album, Artist } from "../../src/services/metadata/models";
import type { MetadataProvider } from "../../src/services/metadata/providers";

const spotifyArtist: Artist = {
  id: "spotify-artist-1",
  name: "Lorna Shore",
  genres: [{ name: "metalcore" }],
  styles: [],
  externalLinks: [{ label: "Spotify", url: "https://open.spotify.com/artist/spotify-artist-1", provider: "spotify" }],
};

const musicBrainzArtist: Artist = {
  id: "musicbrainz-artist-1",
  name: "Lorna Shore",
  disambiguation: "American deathcore band",
  genres: [{ id: "genre-1", name: "Deathcore" }],
  styles: [{ name: "symphonic deathcore" }],
  externalLinks: [{ label: "MusicBrainz", url: "https://musicbrainz.org/artist/musicbrainz-artist-1", provider: "musicbrainz" }],
};

const spotifyAlbum: Album = {
  id: "spotify-album-1",
  title: "Pain Remains",
  artists: [spotifyArtist],
  format: "album",
  releaseDate: "2022-10-14",
  artworkUrl: "https://images.example/pain-remains.jpg",
  runtimeMs: undefined,
  labels: [],
  genres: [{ name: "metalcore" }],
  styles: [],
  tracks: [{
    id: "spotify-track-1",
    title: "Welcome Back, O' Sleeping Dreamer",
    position: 1,
    durationMs: 322000,
    discNumber: 1,
    artists: [spotifyArtist],
    credits: [],
    genres: [],
    styles: [],
    externalLinks: [],
  }],
  credits: [],
  externalLinks: [{ label: "Spotify", url: "https://open.spotify.com/album/spotify-album-1", provider: "spotify" }],
};

const musicBrainzAlbum: Album = {
  id: "musicbrainz-album-1",
  title: "Pain Remains",
  artists: [musicBrainzArtist],
  format: "album",
  releaseDate: "2022-10-14",
  runtimeMs: 629000,
  labels: [{ id: "label-1", name: "Century Media Records" }],
  genres: [{ id: "genre-1", name: "Deathcore" }],
  styles: [{ name: "symphonic deathcore" }],
  tracks: [{
    id: "musicbrainz-track-1",
    title: "Welcome Back, O' Sleeping Dreamer",
    position: 1,
    durationMs: 322000,
    discNumber: 1,
    artists: [musicBrainzArtist],
    credits: [],
    genres: [],
    styles: [],
    externalLinks: [{ label: "MusicBrainz", url: "https://musicbrainz.org/recording/musicbrainz-track-1", provider: "musicbrainz" }],
  }],
  credits: [],
  externalLinks: [{ label: "MusicBrainz", url: "https://musicbrainz.org/release-group/musicbrainz-album-1", provider: "musicbrainz" }],
};

const createProvider = (id: string, responses: {
  searchArtists?: Artist[];
  getArtist?: Artist | null;
  searchAlbums?: Album[];
  getAlbum?: Album | null;
}): MetadataProvider => ({
  id,
  async searchArtists() {
    return { items: responses.searchArtists || [], hasMore: false };
  },
  async getArtist() {
    return responses.getArtist || null;
  },
  async searchAlbums() {
    return { items: responses.searchAlbums || [], hasMore: false };
  },
  async getAlbum() {
    return responses.getAlbum || null;
  },
});

test("MetadataService enriches Spotify artist lookups with MusicBrainz metadata", async () => {
  const service = new MetadataService([
    createProvider("spotify", { getArtist: spotifyArtist, searchArtists: [spotifyArtist] }),
    createProvider("musicbrainz", { getArtist: musicBrainzArtist, searchArtists: [musicBrainzArtist] }),
  ]);

  const artist = await service.getArtist("spotify-artist-1");

  assert.equal(artist?.name, "Lorna Shore");
  assert.equal(artist?.disambiguation, "American deathcore band");
  assert.deepEqual(artist?.genres.map((genre) => genre.name), ["metalcore", "Deathcore"]);
  assert.deepEqual(artist?.styles.map((style) => style.name), ["symphonic deathcore"]);
  assert.equal(artist?.externalLinks.length, 2);
});

test("MetadataService enriches Spotify album lookups with MusicBrainz labels and runtime", async () => {
  const service = new MetadataService([
    createProvider("spotify", { getAlbum: spotifyAlbum, searchAlbums: [spotifyAlbum] }),
    createProvider("musicbrainz", { getAlbum: musicBrainzAlbum, searchAlbums: [musicBrainzAlbum] }),
  ]);

  const album = await service.getAlbum("spotify-album-1");

  assert.equal(album?.title, "Pain Remains");
  assert.equal(album?.runtimeMs, 629000);
  assert.deepEqual(album?.labels.map((label) => label.name), ["Century Media Records"]);
  assert.deepEqual(album?.genres.map((genre) => genre.name), ["metalcore", "Deathcore"]);
  assert.equal(album?.tracks[0].externalLinks[0].url, "https://musicbrainz.org/recording/musicbrainz-track-1");
  assert.equal(album?.externalLinks.length, 2);
});