import assert from "node:assert/strict";
import test from "node:test";
import { MusicBrainzProvider } from "../../src/services/metadata/providers/MusicBrainzProvider";

const LORNA_SHORE_MBID = "4d5c9f42-1e62-4d75-9339-f1f7cb5d2485";
const PAIN_REMAINS_GROUP_MBID = "e5904cf4-37e9-4b05-b0e5-d781be4ed214";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const createProvider = (handler: (url: URL) => Response) => new MusicBrainzProvider({
  fetchFn: async (input) => handler(new URL(String(input))),
  minRequestIntervalMs: 0,
});

test("searchArtist normalizes well-known MusicBrainz artist results", async () => {
  const provider = createProvider((url) => {
    assert.equal(url.pathname, "/ws/2/artist");
    assert.equal(url.searchParams.get("query"), "Lorna Shore");
    return response({
      count: 3,
      artists: [
        { id: LORNA_SHORE_MBID, name: "Lorna Shore", "sort-name": "Lorna Shore", tags: [{ name: "deathcore" }] },
        { id: "metallica-mbid", name: "Metallica" },
        { id: "bmth-mbid", name: "Bring Me the Horizon" },
      ],
    });
  });

  const result = await provider.searchArtist("Lorna Shore", { limit: 3 });

  assert.equal(result.items[0].id, LORNA_SHORE_MBID);
  assert.equal(result.items[0].name, "Lorna Shore");
  assert.deepEqual(result.items[0].styles, [{ name: "deathcore" }]);
  assert.equal(result.items[0].externalLinks[0].url, `https://musicbrainz.org/artist/${LORNA_SHORE_MBID}`);
  assert.equal(result.hasMore, false);
});

test("getArtist includes normalized genres, tags, and external links", async () => {
  const provider = createProvider((url) => {
    assert.equal(url.pathname, `/ws/2/artist/${LORNA_SHORE_MBID}`);
    assert.equal(url.searchParams.get("inc"), "genres+tags+url-rels");
    return response({
      id: LORNA_SHORE_MBID,
      name: "Lorna Shore",
      disambiguation: "American deathcore band",
      genres: [{ id: "genre-mbid", name: "Deathcore" }],
      tags: [{ name: "symphonic deathcore" }],
      relations: [{ type: "official homepage", url: { resource: "https://www.lornashore.com/" } }],
    });
  });

  const artist = await provider.getArtist(LORNA_SHORE_MBID);

  assert.equal(artist?.name, "Lorna Shore");
  assert.deepEqual(artist?.genres, [{ id: "genre-mbid", name: "Deathcore" }]);
  assert.deepEqual(artist?.styles, [{ name: "symphonic deathcore" }]);
  assert.equal(artist?.externalLinks.at(-1)?.url, "https://www.lornashore.com/");
});

test("searchAlbum uses release groups as normalized logical albums", async () => {
  const provider = createProvider((url) => {
    assert.equal(url.pathname, "/ws/2/release-group");
    assert.equal(url.searchParams.get("query"), "Pain Remains");
    return response({
      count: 4,
      "release-groups": [
        { id: PAIN_REMAINS_GROUP_MBID, title: "Pain Remains", "first-release-date": "2022-10-14", "primary-type": "Album", "artist-credit": [{ artist: { id: LORNA_SHORE_MBID, name: "Lorna Shore" } }] },
        { id: "master-mbid", title: "Master of Puppets", "primary-type": "Album" },
        { id: "sempiternal-mbid", title: "Sempiternal", "primary-type": "Album" },
        { id: "nocturnal-mbid", title: "Nocturnal", "primary-type": "Album" },
      ],
    });
  });

  const result = await provider.searchAlbum("Pain Remains", { limit: 4 });

  assert.equal(result.items[0].id, PAIN_REMAINS_GROUP_MBID);
  assert.equal(result.items[0].title, "Pain Remains");
  assert.equal(result.items[0].releaseDate, "2022-10-14");
  assert.equal(result.items[0].format, "album");
  assert.equal(result.items[0].artists[0].name, "Lorna Shore");
});

test("getAlbum enriches a release group with track, label, genre, and MBID data", async () => {
  const provider = createProvider((url) => {
    if (url.pathname === `/ws/2/release-group/${PAIN_REMAINS_GROUP_MBID}`) {
      return response({
        id: PAIN_REMAINS_GROUP_MBID,
        title: "Pain Remains",
        "first-release-date": "2022-10-14",
        "primary-type": "Album",
        "artist-credit": [{ artist: { id: LORNA_SHORE_MBID, name: "Lorna Shore" } }],
        genres: [{ id: "metal-mbid", name: "Metal" }],
        tags: [{ name: "deathcore" }],
      });
    }

    assert.equal(url.pathname, "/ws/2/release");
    assert.equal(url.searchParams.get("release-group"), PAIN_REMAINS_GROUP_MBID);
    return response({
      releases: [{
        id: "pain-remains-release-mbid",
        date: "2022-10-14",
        "label-info": [{ label: { id: "century-media-mbid", name: "Century Media Records" } }],
        media: [{ position: 1, tracks: [
          { id: "track-one-mbid", number: "1", title: "Welcome Back, O' Sleeping Dreamer", length: 322000, recording: { id: "recording-one-mbid", title: "Welcome Back, O' Sleeping Dreamer" } },
          { id: "track-two-mbid", number: "2", title: "Into the Earth", length: 307000, recording: { id: "recording-two-mbid", title: "Into the Earth" } },
        ] }],
      }],
    });
  });

  const album = await provider.getAlbum(PAIN_REMAINS_GROUP_MBID);

  assert.equal(album?.id, PAIN_REMAINS_GROUP_MBID);
  assert.equal(album?.title, "Pain Remains");
  assert.equal(album?.releaseDate, "2022-10-14");
  assert.equal(album?.tracks.length, 2);
  assert.equal(album?.runtimeMs, 629000);
  assert.deepEqual(album?.labels.map((label) => label.name), ["Century Media Records"]);
  assert.deepEqual(album?.genres, [{ id: "metal-mbid", name: "Metal" }]);
  assert.equal(album?.externalLinks[0].url, `https://musicbrainz.org/release-group/${PAIN_REMAINS_GROUP_MBID}`);
});

test("normalization handles incomplete MusicBrainz data and unknown IDs gracefully", async () => {
  const provider = createProvider((url) => {
    if (url.pathname === "/ws/2/release-group/missing-metadata") {
      return response({ id: "missing-metadata", title: "Nocturnal" });
    }
    if (url.pathname === "/ws/2/release") return response({ releases: [] });
    return response({}, 404);
  });

  const album = await provider.getAlbum("missing-metadata");
  const artist = await provider.getArtist("unknown-artist-mbid");

  assert.equal(album?.title, "Nocturnal");
  assert.deepEqual(album?.artists, []);
  assert.deepEqual(album?.labels, []);
  assert.deepEqual(album?.tracks, []);
  assert.equal(album?.releaseDate, undefined);
  assert.equal(artist, null);
});
