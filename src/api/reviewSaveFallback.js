import { normalizeLegacyRatingValue } from "../utils/ratings/RatingUtils.js";

export const isAlbumRatingRangeConstraintError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();

  return message.includes("reviews_album_rating_range")
    || message.includes("album_rating_range")
    || details.includes("album_rating_range");
};

export const toTenPointStorageValue = (value) => {
  const normalized = normalizeLegacyRatingValue(value);
  return Math.round((normalized / 10) * 1000) / 1000;
};

export const toTenPointCompatibleReviewRow = (row = {}) => ({
  ...row,
  album_rating: row.album_rating !== undefined ? toTenPointStorageValue(row.album_rating) : row.album_rating,
  manual_rating: row.manual_rating !== undefined ? toTenPointStorageValue(row.manual_rating) : row.manual_rating,
});

export const getTenPointRetryRow = (error, row = {}) => {
  if (!isAlbumRatingRangeConstraintError(error)) {
    return null;
  }

  return toTenPointCompatibleReviewRow(row);
};
