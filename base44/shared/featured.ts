export const FEATURED_MIN_RATINGS = 10;
export const FEATURED_MIN_AVG = 8;

export function normalizeAlbumKey(album_title, artist) {
  return `${(album_title || "").trim().toLowerCase()}__${(artist || "").trim().toLowerCase()}`;
}

export function computeFeaturedAlbums(reviews) {
  const map = new Map();
  for (const r of reviews) {
    if (!r.album_title || !r.artist) continue;
    const key = normalizeAlbumKey(r.album_title, r.artist);
    if (!map.has(key)) {
      map.set(key, {
        album_title: r.album_title,
        artist: r.artist,
        album_art_url: r.album_art_url || "",
        release_year: r.release_year || "",
        userRatings: new Map(),
        totalRating: 0,
      });
    }
    const album = map.get(key);
    const userId = r.created_by_id;
    if (!album.userRatings.has(userId)) {
      album.userRatings.set(userId, r.album_rating || 0);
      album.totalRating += r.album_rating || 0;
    }
  }
  const featured = [];
  for (const album of map.values()) {
    const count = album.userRatings.size;
    if (count < FEATURED_MIN_RATINGS) continue;
    const avg = count > 0 ? album.totalRating / count : 0;
    if (avg < FEATURED_MIN_AVG) continue;
    featured.push({
      album_title: album.album_title,
      artist: album.artist,
      album_art_url: album.album_art_url,
      release_year: album.release_year,
      rating_count: count,
      avg_rating: Math.round(avg * 10) / 10,
    });
  }
  featured.sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count);
  return featured;
}

export function isAlbumFeatured(reviews, album_title, artist) {
  const key = normalizeAlbumKey(album_title, artist);
  const userRatings = new Map();
  let totalRating = 0;
  let artUrl = "";
  for (const r of reviews) {
    if (normalizeAlbumKey(r.album_title, r.artist) !== key) continue;
    const userId = r.created_by_id;
    if (!artUrl && r.album_art_url) artUrl = r.album_art_url;
    if (!userRatings.has(userId)) {
      userRatings.set(userId, r.album_rating || 0);
      totalRating += r.album_rating || 0;
    }
  }
  const count = userRatings.size;
  const avg = count > 0 ? totalRating / count : 0;
  return {
    featured: count >= FEATURED_MIN_RATINGS && avg >= FEATURED_MIN_AVG,
    count,
    avg: Math.round(avg * 10) / 10,
    album_art_url: artUrl,
  };
}