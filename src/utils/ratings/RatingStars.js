export const getRatingStarSegments = (value, starCount = 5) => {
  const numericValue = Number.isFinite(Number(value)) ? Math.min(Math.max(Number(value), 0), 100) : 0;
  const fillCount = (numericValue / 100) * starCount;

  return Array.from({ length: starCount }, (_, index) => {
    const remaining = fillCount - index;
    if (remaining >= 1) return 1;
    if (remaining <= 0) return 0;
    return remaining;
  });
};

export const getRatingStarLabel = (value, starCount = 5) => {
  const numericValue = Number.isFinite(Number(value)) ? Math.min(Math.max(Number(value), 0), 100) : 0;
  const filled = Math.round((numericValue / 100) * starCount);
  return `${"★".repeat(filled)}${"☆".repeat(Math.max(starCount - filled, 0))}`;
};