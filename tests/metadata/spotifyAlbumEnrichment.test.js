import assert from "node:assert/strict";
import test from "node:test";
import { enrichSpotifyAlbumDetails } from "../../api/_lib/spotify.js";

test("enrichSpotifyAlbumDetails merges MusicBrainz label, genres, and runtime without changing Spotify fields", async () => {
  const originalFetch = global.fetch;

  global.fetch = async (input) => {
    const url = new URL(String(input));

    if (url.pathname === "/ws/2/release-group") {
      return new Response(JSON.stringify({
        "release-groups": [{
          id: "mb-release-group-1",
          title: "Pain Remains",
          "first-release-date": "2022-10-14",
          "artist-credit": [{ artist: { name: "Lorna Shore" } }],
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/ws/2/release-group/mb-release-group-1") {
      return new Response(JSON.stringify({
        id: "mb-release-group-1",
        title: "Pain Remains",
        "first-release-date": "2022-10-14",
        genres: [{ name: "Deathcore" }],
        "artist-credit": [{ artist: { name: "Lorna Shore" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/ws/2/release") {
      return new Response(JSON.stringify({
        releases: [{
          id: "mb-release-1",
          date: "2022-10-14",
          "label-info": [{ label: { name: "Century Media Records" } }],
          media: [{ position: 1, tracks: [
            { id: "track-1", number: "1", title: "Welcome Back, O' Sleeping Dreamer", length: 322000 },
            { id: "track-2", number: "2", title: "Into the Earth", length: 307000 },
          ] }],
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url.toString()}`);
  };

  try {
    const spotifyAlbum = {
      id: "spotify-album-1",
      title: "Pain Remains",
      artist: "Lorna Shore",
      artwork_url: "https://images.example/pain-remains.jpg",
      release_year: "2022",
      release_date: "2022-10-14",
      album_type: "album",
      track_count: 10,
      label: "",
      genres: ["metalcore"],
      runtime_ms: null,
      credits: [],
    };

    const enrichedAlbum = await enrichSpotifyAlbumDetails(spotifyAlbum);

    assert.equal(enrichedAlbum.id, "spotify-album-1");
    assert.equal(enrichedAlbum.title, "Pain Remains");
    assert.equal(enrichedAlbum.artist, "Lorna Shore");
    assert.equal(enrichedAlbum.label, "Century Media Records");
    assert.deepEqual(enrichedAlbum.genres, ["metalcore", "Deathcore"]);
    assert.equal(enrichedAlbum.runtime_ms, 629000);
    assert.equal(enrichedAlbum.artwork_url, "https://images.example/pain-remains.jpg");
  } finally {
    global.fetch = originalFetch;
  }
});