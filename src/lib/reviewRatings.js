const QUARTER_STEP = 0.25;
const HALF_STEP = 0.5;
const TEN_POINT_MAX = 10;

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export const normalizeReviewRatingValue = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  if (numericValue > TEN_POINT_MAX) {
    return roundToQuarterStep(numericValue / TEN_POINT_MAX);
  }
  return numericValue;
};

export const isAdvancedReviewRatingValue = (value) => {
  const numericValue = normalizeReviewRatingValue(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return false;
  return Math.abs(numericValue - roundToHalfStep(numericValue)) > 0.000001;
};

export const getReviewRatingScale = () => TEN_POINT_MAX;

export const formatReviewRatingValue = (value, advanced = isAdvancedReviewRatingValue(value)) => {
  const numericValue = normalizeReviewRatingValue(value);
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
  const numericValue = roundToQuarterStep(normalizeReviewRatingValue(value));
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
  return numericValue.toFixed(2);
};

export const validateAdvancedReviewInput = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { value: null, error: "Enter a rating between 1 and 10." };
  }

  if (!/^\d{1,2}(\.\d{0,2})?$/.test(trimmed)) {
    return { value: null, error: "Use numbers only, with up to 2 decimal places." };
  }

  const parsed = Number(trimmed);
  if (!isFiniteNumber(parsed) || parsed < 1 || parsed > TEN_POINT_MAX) {
    return { value: null, error: "Advanced Review must be between 1 and 10." };
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