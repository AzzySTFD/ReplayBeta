export const RATING_DESCRIPTIONS = [
  { min: 100, max: 100, label: "Masterpiece" },
  { min: 95, max: 99, label: "Amazing" },
  { min: 90, max: 94, label: "Excellent" },
  { min: 80, max: 89, label: "Great" },
  { min: 70, max: 79, label: "Good" },
  { min: 60, max: 69, label: "Decent" },
  { min: 50, max: 59, label: "Average" },
  { min: 40, max: 49, label: "Mixed" },
  { min: 30, max: 39, label: "Poor" },
  { min: 20, max: 29, label: "Bad" },
  { min: 10, max: 19, label: "Awful" },
  { min: 0, max: 9, label: "Unlistenable" },
];

export const getRatingDescription = (value) => {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return RATING_DESCRIPTIONS.find((entry) => numericValue >= entry.min && numericValue <= entry.max)?.label || "Unlistenable";
};