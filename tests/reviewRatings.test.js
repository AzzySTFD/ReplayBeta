import assert from "node:assert/strict";
import test from "node:test";
import {
  clampRatingValue,
  convertDisplayRatingToStoredValue,
  formatRatingDisplay,
  getRatingDescription,
  normalizeLegacyRatingValue,
  normalizeRatingDisplayPreference,
  normalizeTrackRatings,
} from "../src/utils/ratings/index.js";

test("legacy ratings normalize into 100-point integers", () => {
  assert.equal(normalizeLegacyRatingValue(8), 80);
  assert.equal(normalizeLegacyRatingValue(9), 90);
  assert.equal(normalizeLegacyRatingValue(94), 94);
  assert.equal(normalizeLegacyRatingValue(94.25), 94.25);
});

test("display helpers support 100, 10, and star preferences", () => {
  assert.deepEqual(formatRatingDisplay(94.25, "100"), { value: "94.25", suffix: "/100" });
  assert.deepEqual(formatRatingDisplay(94.25, "10"), { value: "9.43", suffix: "/10" });
  assert.deepEqual(formatRatingDisplay(94, "stars"), { value: "★★★★★", suffix: "" });
  assert.equal(normalizeRatingDisplayPreference("stars"), "stars");
});

test("conversion and descriptions keep ratings in range", () => {
  assert.equal(clampRatingValue(120), 100);
  assert.equal(clampRatingValue(94.257), 94.26);
  assert.equal(convertDisplayRatingToStoredValue(9.43, "10"), 94.3);
  assert.equal(convertDisplayRatingToStoredValue("94.25", "100"), 94.25);
  assert.equal(getRatingDescription(94), "Excellent");
  const tracks = normalizeTrackRatings([{ rating: 8 }, { rating: 91 }]);
  assert.equal(tracks[0].rating, 80);
  assert.equal(tracks[1].rating, 91);
});