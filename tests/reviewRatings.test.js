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
});

test("display helpers support 100, 10, and star preferences", () => {
  assert.deepEqual(formatRatingDisplay(94, "100"), { value: "94", suffix: "/100" });
  assert.deepEqual(formatRatingDisplay(94, "10"), { value: "9.4", suffix: "/10" });
  assert.deepEqual(formatRatingDisplay(94, "stars"), { value: "★★★★★", suffix: "" });
  assert.equal(normalizeRatingDisplayPreference("stars"), "stars");
});

test("conversion and descriptions keep ratings in range", () => {
  assert.equal(clampRatingValue(120), 100);
  assert.equal(convertDisplayRatingToStoredValue(9.4, "10"), 94);
  assert.equal(convertDisplayRatingToStoredValue("94", "100"), 94);
  assert.equal(getRatingDescription(94), "Excellent");
  const tracks = normalizeTrackRatings([{ rating: 8 }, { rating: 91 }]);
  assert.equal(tracks[0].rating, 80);
  assert.equal(tracks[1].rating, 91);
});