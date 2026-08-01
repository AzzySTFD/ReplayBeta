import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReviewRatingValue,
  isAdvancedReviewRatingValue,
  roundToQuarterStep,
  validateAdvancedReviewInput,
} from "../src/lib/reviewRatings.js";

test("advanced review ratings are detected and formatted on a 100-point scale", () => {
  assert.equal(isAdvancedReviewRatingValue(90.25), true);
  assert.equal(formatReviewRatingValue(90.25, true), "90.25");
  assert.equal(formatReviewRatingValue(8.5, false), "8.5");
});

test("advanced review input only accepts quarter-step values between 0 and 100", () => {
  assert.equal(roundToQuarterStep(90.24), 90.25);
  assert.deepEqual(validateAdvancedReviewInput("90.25"), { value: 90.25, error: "" });
  assert.equal(validateAdvancedReviewInput("90.20").error, "Advanced Review must use .25 increments.");
  assert.equal(validateAdvancedReviewInput("101").error, "Advanced Review must be between 0 and 100.");
});