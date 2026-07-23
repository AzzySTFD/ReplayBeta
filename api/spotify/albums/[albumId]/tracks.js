import { spotifyFetch } from "../../../_lib/spotify.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const albumId = String(req.query?.albumId || "").trim();
    if (!albumId) {
      return res.status(400).json({ error: "Missing album ID" });
    }

    const data = await spotifyFetch(`/albums/${encodeURIComponent(albumId)}?market=US`);
    if (!data) {
      return res.status(200).json({ tracks: [] });
    }

    const tracks = (data.tracks?.items || []).map((track) => ({
      position: track.track_number,
      title: track.name,
    }));

    return res.status(200).json({ tracks });
  } catch (error) {
    console.error("Spotify tracks API error", error);
    return res.status(500).json({ error: error.message || "Spotify album tracks failed" });
  }
}
