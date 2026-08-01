const RATING_MIN = 0;
const RATING_MAX = 100;

export const RATING_DISPLAY_PREFERENCES = ["100", "10", "stars"];
export const DEFAULT_RATING_DISPLAY_PREFERENCE = "100";

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export const clampRatingValue = (value) => {
  const numericValue = Number(value);
  if (!isFiniteNumber(numericValue)) return 0;
  const clampedValue = Math.min(RATING_MAX, Math.max(RATING_MIN, numericValue));
  return Math.round(clampedValue * 100) / 100;
};

export const normalizeLegacyRatingValue = (value) => {
  const numericValue = Number(value);
  if (!isFiniteNumber(numericValue) || numericValue <= 0) return 0;
  if (numericValue <= 10) {
    return clampRatingValue(numericValue * 10);
  }
  return clampRatingValue(numericValue);
};

export const normalizeTrackRatings = (tracks = []) => tracks.map((track) => ({
  ...track,
  rating: normalizeLegacyRatingValue(track?.rating),
}));

export const normalizeRatingDisplayPreference = (value) => {
  const normalized = String(value || DEFAULT_RATING_DISPLAY_PREFERENCE).trim();
  return RATING_DISPLAY_PREFERENCES.includes(normalized) ? normalized : DEFAULT_RATING_DISPLAY_PREFERENCE;
};

export const getRatingDisplayPreference = (profile) => normalizeRatingDisplayPreference(
  profile?.social_links?.profile_customization?.rating_display_preference
);

export const getRatingDisplaySuffix = (preference) => {
  const normalized = normalizeRatingDisplayPreference(preference);
  if (normalized === "10") return "/10";
  if (normalized === "100") return "/100";
  return "";
};

export const convertRatingForDisplay = (value, preference) => {
  const normalizedValue = normalizeLegacyRatingValue(value);
  const normalizedPreference = normalizeRatingDisplayPreference(preference);

  if (normalizedPreference === "10") {
    const displayValue = normalizedValue / 10;
    return Number(displayValue.toFixed(2)).toString();
  }

  if (normalizedPreference === "stars") {
    return normalizedValue;
  }

  return String(normalizedValue);
};

export const convertDisplayRatingToStoredValue = (value, preference) => {
  const normalizedPreference = normalizeRatingDisplayPreference(preference);
  if (normalizedPreference === "10") {
    return clampRatingValue(Number(value) * 10);
  }

  if (normalizedPreference === "stars") {
    return clampRatingValue(Number(value) * 20);
  }

  return clampRatingValue(value);
};

export const scaleTrackAverageToStoredValue = (trackAverage) => clampRatingValue(trackAverage);