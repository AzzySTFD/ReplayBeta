import { spotifyFetch } from "../../_lib/spotify.js";

const resolveAlbumId = (req) => {
  const fromQuery = req.query?.albumId;
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim();
  }

  const fromBody = typeof req.body === "string"
    ? (() => {
        try {
          return JSON.parse(req.body || "{}").albumId;
        } catch {
          return undefined;
        }
      })()
    : req.body?.albumId;

  return typeof fromBody === "string" ? fromBody.trim() : "";
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const albumId = resolveAlbumId(req);
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
