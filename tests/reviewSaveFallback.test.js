import assert from "node:assert/strict";
import test from "node:test";
import {
  getTenPointRetryRow,
  isAlbumRatingRangeConstraintError,
  toTenPointCompatibleReviewRow,
  toTenPointStorageValue,
} from "../src/api/reviewSaveFallback.js";

test("constraint detector identifies album rating range violations", () => {
  assert.equal(isAlbumRatingRangeConstraintError({ message: "violates check constraint reviews_album_rating_range" }), true);
  assert.equal(isAlbumRatingRangeConstraintError({ details: "check constraint album_rating_range" }), true);
  assert.equal(isAlbumRatingRangeConstraintError({ message: "some other error" }), false);
});

test("ten point conversion keeps compatibility with legacy DB constraint", () => {
  assert.equal(toTenPointStorageValue(85.45), 8.545);
  assert.equal(toTenPointStorageValue(94.25), 9.425);

  const row = toTenPointCompatibleReviewRow({ album_rating: 85.45, manual_rating: 94.25 });
  assert.equal(row.album_rating, 8.545);
  assert.equal(row.manual_rating, 9.425);
});

test("retry row is only produced for album rating constraint errors", () => {
  const row = { album_rating: 85.45, manual_rating: 94.25 };

  const retry = getTenPointRetryRow({ message: "violates check constraint reviews_album_rating_range" }, row);
  assert.equal(retry.album_rating, 8.545);
  assert.equal(retry.manual_rating, 9.425);

  assert.equal(getTenPointRetryRow({ message: "permission denied" }, row), null);
});
