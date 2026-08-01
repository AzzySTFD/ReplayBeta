import { normalizeLegacyRatingValue, normalizeTrackRatings } from "../utils/ratings/RatingUtils.js";

export const normalizeReviewRowRatings = (row = {}) => ({
  ...row,
  album_rating: normalizeLegacyRatingValue(row?.album_rating ?? 0),
  manual_rating: normalizeLegacyRatingValue(row?.manual_rating ?? 0),
  tracks: normalizeTrackRatings(row?.tracks || []),
});

export const mapReviewRowToEntity = (row) => {
  if (!row) return null;

  const normalizedRow = normalizeReviewRowRatings(row);

  return {
    id: normalizedRow.id,
    created_by_id: normalizedRow.created_by_id || normalizedRow.user_id,
    username: normalizedRow.username || "",
    spotify_album_id: normalizedRow.spotify_album_id || "",
    spotify_artist_id: normalizedRow.spotify_artist_id || "",
    album_title: normalizedRow.album_title || "",
    artist: normalizedRow.artist || "",
    album_art_url: normalizedRow.album_art_url || "",
    release_year: normalizedRow.release_year || "",
    tracks: normalizedRow.tracks || [],
    album_rating: normalizedRow.album_rating ?? 0,
    use_manual_rating: normalizedRow.use_manual_rating ?? false,
    manual_rating: normalizedRow.manual_rating ?? 0,
    notes: normalizedRow.notes || "",
    reactions: normalizedRow.reactions || [],
    comments: normalizedRow.comments || [],
    folder_id: normalizedRow.folder_id || null,
    folder_name: normalizedRow.folder_name || "",
    created_at: normalizedRow.created_at,
    updated_at: normalizedRow.updated_at,
  };
};
