import { mapSpotifyAlbum, spotifyFetch } from "../_lib/spotify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const query = String(body.query || "").trim();

    if (!query) {
      return res.status(200).json({ albums: [] });
    }

    const searchData = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=album&limit=10&market=US`);
    if (!searchData) {
      return res.status(200).json({ albums: [] });
    }

    const albums = (searchData.albums?.items || []).map(mapSpotifyAlbum);
    return res.status(200).json({ albums });
  } catch (error) {
    console.error("Spotify search API error", error);
    return res.status(500).json({ error: error.message || "Spotify search failed" });
  }
}
