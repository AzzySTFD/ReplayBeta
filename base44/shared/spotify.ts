let cachedToken = null;
let tokenExpiresAt = 0;

export async function getSpotifyToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }
  const clientId = Deno.env.get("61d2fb8b0b0948808f810194b5853e37");
  const clientSecret = Deno.env.get("d8cfe6eed5fb4f32a0768954b82b2f1c");
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }
  const auth = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Spotify token request failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return cachedToken;
}

export async function spotifyFetch(path) {
  const token = await getSpotifyToken();
  const resp = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401) {
    cachedToken = null;
    const newToken = await getSpotifyToken();
    const retry = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    if (!retry.ok) {
      const t = await retry.text().catch(() => "");
      throw new Error(`Spotify API error: ${retry.status} ${t}`);
    }
    return await retry.json();
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Spotify API error: ${resp.status} ${t}`);
  }
  return await resp.json();
}