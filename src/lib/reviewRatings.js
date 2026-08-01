const QUARTER_STEP = 0.25;
const HALF_STEP = 0.5;
const TEN_POINT_MAX = 10;
const HUNDRED_POINT_MAX = 100;

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export const isAdvancedReviewRatingValue = (value) => Number(value || 0) > TEN_POINT_MAX;

export const getReviewRatingScale = (value, advanced = isAdvancedReviewRatingValue(value)) => (
  advanced ? HUNDRED_POINT_MAX : TEN_POINT_MAX
);

export const formatReviewRatingValue = (value, advanced = isAdvancedReviewRatingValue(value)) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return advanced ? numericValue.toFixed(2) : numericValue.toFixed(1);
};

export const roundToHalfStep = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.round(numericValue / HALF_STEP) * HALF_STEP;
};

export const roundToQuarterStep = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.round(numericValue / QUARTER_STEP) * QUARTER_STEP;
};

export const formatAdvancedReviewInput = (value) => {
  const numericValue = roundToQuarterStep(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
  return numericValue.toFixed(2);
};

export const validateAdvancedReviewInput = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { value: null, error: "Enter a rating between 0 and 100." };
  }

  if (!/^\d{1,3}(\.\d{0,2})?$/.test(trimmed)) {
    return { value: null, error: "Use numbers only, with up to 2 decimal places." };
  }

  const parsed = Number(trimmed);
  if (!isFiniteNumber(parsed) || parsed < 0 || parsed > HUNDRED_POINT_MAX) {
    return { value: null, error: "Advanced Review must be between 0 and 100." };
  }

  const rounded = roundToQuarterStep(parsed);
  if (Math.abs(parsed - rounded) > 0.000001) {
    return { value: null, error: "Advanced Review must use .25 increments." };
  }

  return { value: rounded, error: "" };
};

export const getDisplayScaleLabel = (value, advanced = isAdvancedReviewRatingValue(value)) => (
  ` / ${getReviewRatingScale(value, advanced)}`
);