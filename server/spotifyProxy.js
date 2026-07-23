import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import { classifyImportSource, extractAlbumCandidatesFromHtml, normalizeImportUrl } from './importHelpers.js';

const app = express();
app.use(express.json());

const getSpotifyToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
};

const spotifyFetch = async (path) => {
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

app.post('/api/spotify/search', async (req, res) => {
  try {
    const query = req.body?.query?.trim();
    if (!query) {
      return res.json({ albums: [] });
    }

    const searchData = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=album&limit=10&market=US`);
    if (!searchData) {
      return res.json({ albums: [] });
    }

    const albums = (searchData.albums?.items || []).map((album) => ({
      id: album.id,
      title: album.name,
      artist: (album.artists || []).map((artist) => artist.name).join(', '),
      artwork_url: (album.images || []).find((image) => image.width >= 300)?.url || album.images?.[0]?.url || '',
      release_year: (album.release_date || '').slice(0, 4),
      album_type: album.album_type || 'album',
    }));

    return res.json({ albums });
  } catch (error) {
    console.error('Spotify search proxy error', error);
    return res.status(500).json({ error: error.message || 'Spotify search failed' });
  }
});

app.get('/api/spotify/albums/:albumId/tracks', async (req, res) => {
  try {
    const data = await spotifyFetch(`/albums/${req.params.albumId}?market=US`);
    if (!data) {
      return res.json({ tracks: [] });
    }

    const tracks = (data.tracks?.items || []).map((track) => ({
      position: track.track_number,
      title: track.name,
    }));

    return res.json({ tracks });
  } catch (error) {
    console.error('Spotify album tracks proxy error', error);
    return res.status(500).json({ error: error.message || 'Spotify album tracks failed' });
  }
});

app.get('/api/spotify/albums/tracks', async (req, res) => {
  try {
    const albumId = String(req.query?.albumId || '').trim();
    if (!albumId) {
      return res.status(400).json({ error: 'Missing album ID' });
    }

    const data = await spotifyFetch(`/albums/${encodeURIComponent(albumId)}?market=US`);
    if (!data) {
      return res.json({ tracks: [] });
    }

    const tracks = (data.tracks?.items || []).map((track) => ({
      position: track.track_number,
      title: track.name,
    }));

    return res.json({ tracks });
  } catch (error) {
    console.error('Spotify album tracks proxy error', error);
    return res.status(500).json({ error: error.message || 'Spotify album tracks failed' });
  }
});

app.post('/api/spotify/notable-releases', async (req, res) => {
  try {
    const genrePath = req.body?.genrePath || [];
    const genreKey = genrePath[genrePath.length - 1] || 'rock';
    const monthRange = Number(req.body?.monthRange || 2);

    const subGenres = {
      rock: ['alternative rock', 'indie rock', 'post-rock', 'classic rock'],
      metal: ['metalcore', 'death metal', 'black metal', 'thrash metal'],
      country: ['outlaw country', 'americana', 'bluegrass', 'alt-country'],
      rap: ['trap', 'boom bap', 'conscious rap', 'hip hop'],
      punk: ['hardcore punk', 'pop punk', 'emo', 'ska punk'],
      'k-pop': ['4th gen k-pop', 'k-pop girl group', 'k-pop boy group', 'j-pop'],
      jazz: ['bebop', 'fusion', 'acid jazz', 'smooth jazz'],
      electronic: ['house', 'techno', 'ambient', 'drum and bass'],
      folk: ['indie folk', 'folk rock', 'americana'],
      indie: ['indie pop', 'indie folk', 'indie rock'],
    };

    const children = (subGenres[genreKey] || []).filter(Boolean);
    const currentDate = new Date();
    const months = [];
    for (let offset = 0; offset < monthRange; offset += 1) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.json({
        parentGenre: genreKey,
        genres: ['rock', 'metal', 'country', 'rap', 'punk', 'k-pop', 'jazz', 'electronic', 'folk', 'indie'],
        children,
        months,
        albums: [],
      });
    }

    const searchQueries = [genreKey, ...children].filter(Boolean).slice(0, 6);
    const seenAlbums = new Set();
    const albumCandidates = [];

    for (const query of searchQueries) {
      const searchData = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=album&limit=8&market=US`);
      const items = (searchData?.albums?.items || [])
        .map((album) => ({
          id: album.id,
          title: album.name,
          artist: (album.artists || []).map((artist) => artist.name).join(', '),
          artwork_url: (album.images || []).find((image) => image.width >= 300)?.url || album.images?.[0]?.url || '',
          release_date: album.release_date || '',
          release_year: (album.release_date || '').slice(0, 4),
          genre: genreKey,
          album_type: album.album_type || 'album',
        }))
        .filter((album) => album.release_date && !seenAlbums.has(album.id));

      items.forEach((album) => {
        seenAlbums.add(album.id);
        albumCandidates.push(album);
      });

      if (albumCandidates.length >= 18) {
        break;
      }
    }

    const albums = albumCandidates.filter((album) => album.release_date).slice(0, 18);

    return res.json({
      parentGenre: genreKey,
      genres: ['rock', 'metal', 'country', 'rap', 'punk', 'k-pop', 'jazz', 'electronic', 'folk', 'indie'],
      children,
      months,
      albums,
    });
  } catch (error) {
    console.error('Notable releases proxy error', error);
    return res.status(500).json({ error: error.message || 'Notable releases failed' });
  }
});

app.post('/api/import/profile', async (req, res) => {
  try {
    const rawUrl = req.body?.url?.trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing profile URL' });
    }

    const normalizedUrl = normalizeImportUrl(rawUrl);
    const source = classifyImportSource(normalizedUrl);

    let html = '';
    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Profile fetch failed with ${response.status}`);
      }
      html = await response.text();
    } catch (error) {
      console.error('Import profile fetch failed', error);
      return res.status(502).json({ error: 'Unable to fetch the profile page' });
    }

    const candidates = extractAlbumCandidatesFromHtml(html, source);
    const preview = candidates.slice(0, 8).map((candidate) => ({
      title: candidate.title,
      href: candidate.href,
    }));

    return res.json({ ok: true, source, url: normalizedUrl, preview });
  } catch (error) {
    console.error('Import profile proxy error', error);
    return res.status(500).json({ error: error.message || 'Import profile failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const requestedPort = Number(process.env.PORT || process.env.VITE_SPOTIFY_PROXY_PORT || 3001);

const listen = (port) => {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Spotify proxy listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy, trying ${port + 1}`);
      server.close(() => listen(port + 1));
      return;
    }

    console.error(error);
    process.exit(1);
  });
};

listen(requestedPort);
