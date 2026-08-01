import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReviewRatingValue,
  isAdvancedReviewRatingValue,
  normalizeReviewRatingValue,
  roundToQuarterStep,
  validateAdvancedReviewInput,
} from "../src/lib/reviewRatings.js";

test("advanced review ratings are detected by quarter-step precision on a 10-point scale", () => {
  assert.equal(isAdvancedReviewRatingValue(8.25), true);
  assert.equal(isAdvancedReviewRatingValue(8.5), false);
  assert.equal(formatReviewRatingValue(8.25, true), "8.25");
  assert.equal(formatReviewRatingValue(8.5, false), "8.5");
});

test("advanced review input only accepts quarter-step values between 1 and 10", () => {
  assert.equal(roundToQuarterStep(8.24), 8.25);
  assert.deepEqual(validateAdvancedReviewInput("8.25"), { value: 8.25, error: "" });
  assert.equal(validateAdvancedReviewInput("8.20").error, "Advanced Review must use .25 increments.");
  assert.equal(validateAdvancedReviewInput("10.25").error, "Advanced Review must be between 1 and 10.");
  assert.equal(validateAdvancedReviewInput("0.75").error, "Advanced Review must be between 1 and 10.");
});

test("legacy 100-point advanced ratings are normalized into the new 10-point scale", () => {
  assert.equal(normalizeReviewRatingValue(90.25), 9);
  assert.equal(formatReviewRatingValue(90.25, false), "9.0");
});