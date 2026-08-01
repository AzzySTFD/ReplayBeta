import { getRatingDescription } from "./RatingDescriptions.js";
import { getRatingStarLabel } from "./RatingStars.js";
import { convertRatingForDisplay, getRatingDisplaySuffix, normalizeRatingDisplayPreference } from "./RatingUtils.js";

export const formatRatingDescription = (value) => getRatingDescription(value);

export const formatRatingValue = (value, preference = "100") => {
  const normalizedPreference = normalizeRatingDisplayPreference(preference);
  if (normalizedPreference === "stars") {
    return getRatingStarLabel(value);
  }

  return convertRatingForDisplay(value, normalizedPreference);
};

export const formatRatingDisplay = (value, preference = "100") => ({
  value: formatRatingValue(value, preference),
  suffix: getRatingDisplaySuffix(preference),
});