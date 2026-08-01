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
  const clamped = Math.min(100, Math.max(0, numericValue));

  if (clamped === 100) return "Masterpiece";
  if (clamped >= 95) return "Amazing";
  if (clamped >= 90) return "Excellent";
  if (clamped >= 80) return "Great";
  if (clamped >= 70) return "Good";
  if (clamped >= 60) return "Decent";
  if (clamped >= 50) return "Average";
  if (clamped >= 40) return "Mixed";
  if (clamped >= 30) return "Poor";
  if (clamped >= 20) return "Bad";
  if (clamped >= 10) return "Awful";
  return "Unlistenable";
};