import { mapSpotifyAlbum, spotifyFetch } from "../_lib/spotify.js";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

const pickRandomSeed = () => {
  const first = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const second = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${first}${second}`;
};

const fetchRandomAlbum = async () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const seed = pickRandomSeed();
    const firstPage = await spotifyFetch(`/search?q=${encodeURIComponent(seed)}&type=album&limit=1&offset=0&market=US`);
    const total = Number(firstPage?.albums?.total || 0);
    if (!total) {
      continue;
    }

    const maxOffset = Math.min(total - 1, 999);
    const randomOffset = Math.floor(Math.random() * (maxOffset + 1));
    const randomPage = await spotifyFetch(
      `/search?q=${encodeURIComponent(seed)}&type=album&limit=1&offset=${randomOffset}&market=US`
    );

    const album = randomPage?.albums?.items?.[0];
    if (album) {
      return mapSpotifyAlbum(album);
    }
  }

  return null;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const album = await fetchRandomAlbum();
    if (!album) {
      return res.status(404).json({ error: "No random album found" });
    }

    return res.status(200).json({ album });
  } catch (error) {
    console.error("Spotify random album API error", error);
    return res.status(500).json({ error: error.message || "Spotify random album failed" });
  }
}
