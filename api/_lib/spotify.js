const getSpotifyToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify token request failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
};

export const spotifyFetch = async (path) => {
  const token = await getSpotifyToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

export const mapSpotifyAlbum = (album) => ({
  id: album.id,
  title: album.name,
  artist: (album.artists || []).map((artist) => artist.name).join(", "),
  artwork_url: (album.images || []).find((image) => image.width >= 300)?.url || album.images?.[0]?.url || "",
  release_year: (album.release_date || "").slice(0, 4),
  album_type: album.album_type || "album",
});
