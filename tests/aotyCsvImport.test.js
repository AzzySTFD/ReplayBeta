import assert from "node:assert/strict";
import test from "node:test";
import {
  findBestAlbumMatchForImport,
  parseAotyCsv,
  parseImportRating,
} from "../src/utils/import/aotyCsvImport.js";

test("parseImportRating supports percent, fractions, and 10-point values", () => {
  assert.equal(parseImportRating("85%"), 85);
  assert.equal(parseImportRating("8.5/10"), 85);
  assert.equal(parseImportRating("4.5/5"), 90);
  assert.equal(parseImportRating("8.3"), 83);
  assert.equal(parseImportRating(""), null);
});

test("parseAotyCsv reads expected AOTY-like columns", () => {
  const csv = [
    "Artist,Album Title,Rating,Review Text,Date Reviewed,Album Type,Year",
    "Radiohead,In Rainbows,90,Great album,2025-02-01,Album,2007",
  ].join("\n");

  const result = parseAotyCsv(csv);
  assert.deepEqual(result.missingColumns, []);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].artist, "Radiohead");
  assert.equal(result.entries[0].albumTitle, "In Rainbows");
  assert.equal(result.entries[0].rating, 90);
  assert.equal(result.entries[0].albumType, "album");
  assert.equal(result.entries[0].year, "2007");
});

test("findBestAlbumMatchForImport requires artist and title alignment", () => {
  const entry = {
    artist: "Radiohead",
    albumTitle: "In Rainbows",
    year: "2007",
    albumType: "album",
  };

  const candidates = [
    {
      id: "wrong-artist",
      artist: "Different Artist",
      title: "In Rainbows",
      release_year: "2007",
      album_type: "album",
    },
    {
      id: "correct",
      artist: "Radiohead",
      title: "In Rainbows",
      release_year: "2007",
      album_type: "album",
    },
  ];

  const result = findBestAlbumMatchForImport(entry, candidates);
  assert.equal(result.status, "matched");
  assert.equal(result.album.id, "correct");
});

test("findBestAlbumMatchForImport flags ambiguous top matches", () => {
  const entry = {
    artist: "The National",
    albumTitle: "Sleep Well Beast",
    year: "2017",
    albumType: "album",
  };

  const candidates = [
    {
      id: "a",
      artist: "The National",
      title: "Sleep Well Beast",
      release_year: "2017",
      album_type: "album",
    },
    {
      id: "b",
      artist: "The National",
      title: "Sleep Well Beast",
      release_year: "2017",
      album_type: "album",
    },
  ];

  const result = findBestAlbumMatchForImport(entry, candidates);
  assert.equal(result.status, "needs_review");
  assert.equal(result.reason, "ambiguous_match");
});