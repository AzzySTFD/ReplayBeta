import assert from "node:assert/strict";
import test from "node:test";
import { mapReviewRowToEntity } from "../src/api/reviewRowMapping.js";
import { getRatingDescription, getRatingStarLabel } from "../src/utils/ratings/index.js";

test("review row mapping normalizes 10-point stored values into canonical 100-point ratings", () => {
  const mapped = mapReviewRowToEntity({
    id: "review-1",
    created_by_id: "user-1",
    album_title: "Example Album",
    artist: "Example Artist",
    album_rating: 8.4,
    manual_rating: 9.1,
    tracks: [{ position: 1, title: "Track 1", rating: 8 }],
  });

  assert.equal(mapped.album_rating, 84);
  assert.equal(mapped.manual_rating, 91);
  assert.equal(mapped.tracks[0].rating, 80);
  assert.equal(getRatingDescription(mapped.album_rating), "Great");
  assert.equal(getRatingStarLabel(mapped.album_rating), "★★★★☆");
});
