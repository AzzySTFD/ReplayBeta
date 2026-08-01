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

export const mapSpotifyAlbumDetails = (album) => {
  const albumTracks = album.tracks?.items || [];
  const totalTracks = Number(album.total_tracks ?? album.tracks?.total ?? 0);
  const hasCompleteTrackList = totalTracks > 0 && albumTracks.length >= totalTracks;

  return {
    ...mapSpotifyAlbum(album),
    release_date: album.release_date || "",
    track_count: totalTracks || null,
    label: album.label || "",
    genres: Array.isArray(album.genres) ? album.genres.filter(Boolean) : [],
    runtime_ms: hasCompleteTrackList
      ? albumTracks.reduce((total, track) => total + Number(track.duration_ms || 0), 0)
      : null,
    credits: [],
  };
};

const MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2";
const MUSICBRAINZ_USER_AGENT = "SpinRate/0.1.0 (metadata enrichment)";

const compact = (values) => values.filter(Boolean);

const normalizeText = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/gi, "")
  .toLowerCase();

const musicBrainzFetch = async (path, params = {}) => {
  const url = new URL(`${MUSICBRAINZ_BASE_URL}${path}`);
  Object.entries({ ...params, fmt: "json" }).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": MUSICBRAINZ_USER_AGENT,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`MusicBrainz request failed: ${response.status}`);
  }

  return response.json();
};

const mapMusicBrainzAlbumSummary = (group) => ({
  id: group.id || "",
  title: group.title || "",
  artist: (group["artist-credit"] || []).map((credit) => credit.artist?.name || credit.name).filter(Boolean).join(", "),
  release_date: group["first-release-date"] || "",
});

const mapMusicBrainzTrack = (track, discNumber) => ({
  id: track.recording?.id || track.id || "",
  title: track.title || track.recording?.title || "",
  position: Number(track.number) || undefined,
  disc_number: discNumber,
  duration_ms: Number(track.length) || null,
});

const mapMusicBrainzAlbumDetails = (group, release) => {
  const tracks = compact((release?.media || []).flatMap((medium, mediumIndex) => (
    (medium.tracks || []).map((track) => mapMusicBrainzTrack(track, Number(medium.position) || mediumIndex + 1))
  )));
  const runtimeMs = tracks.reduce((total, track) => total + Number(track.duration_ms || 0), 0) || null;

  return {
    id: group?.id || release?.["release-group"]?.id || "",
    title: group?.title || release?.title || "",
    artist: (group?.["artist-credit"] || release?.["artist-credit"] || []).map((credit) => credit.artist?.name || credit.name).filter(Boolean).join(", "),
    release_date: group?.["first-release-date"] || release?.date || "",
    label: (release?.["label-info"] || []).map((entry) => entry.label?.name).filter(Boolean)[0] || "",
    genres: compact([...(group?.genres || []), ...(release?.genres || [])].map((genre) => genre?.name).filter(Boolean)),
    runtime_ms: runtimeMs,
    track_count: tracks.length || null,
    credits: [],
    tracks,
  };
};

const scoreMusicBrainzAlbumMatch = (spotifyAlbum, musicBrainzAlbum) => {
  const spotifyTitle = normalizeText(spotifyAlbum.title);
  const musicBrainzTitle = normalizeText(musicBrainzAlbum.title);
  if (!spotifyTitle || !musicBrainzTitle) {
    return 0;
  }

  let score = 0;
  if (spotifyTitle === musicBrainzTitle) {
    score += 100;
  } else if (spotifyTitle.includes(musicBrainzTitle) || musicBrainzTitle.includes(spotifyTitle)) {
    score += 60;
  }

  const spotifyArtist = normalizeText(spotifyAlbum.artist);
  const musicBrainzArtist = normalizeText(musicBrainzAlbum.artist);
  if (spotifyArtist && musicBrainzArtist && spotifyArtist === musicBrainzArtist) {
    score += 60;
  }

  if (spotifyAlbum.release_year && musicBrainzAlbum.release_date?.startsWith(spotifyAlbum.release_year)) {
    score += 10;
  }

  return score;
};

const findMusicBrainzAlbumMatch = (spotifyAlbum, candidates) => {
  let bestMatch = null;
  let bestScore = 100;

  for (const candidate of candidates) {
    const score = scoreMusicBrainzAlbumMatch(spotifyAlbum, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
};

const getRepresentativeMusicBrainzRelease = async (releaseGroupId) => {
  const result = await musicBrainzFetch("/release", {
    "release-group": releaseGroupId,
    status: "official",
    limit: "25",
    inc: "artist-credits+labels+recordings+release-groups+media+genres+tags+url-rels",
  });
  const releases = result?.releases || [];
  if (releases.length === 0) {
    return null;
  }

  return [...releases].sort((left, right) => (left.date || "9999-99-99").localeCompare(right.date || "9999-99-99"))[0];
};

const getMusicBrainzAlbumDetails = async (spotifyAlbum) => {
  const searchQuery = [spotifyAlbum.artist, spotifyAlbum.title].filter(Boolean).join(" ");
  const searchData = await musicBrainzFetch("/release-group", { query: searchQuery, limit: "10" });
  const candidates = (searchData?.["release-groups"] || []).map(mapMusicBrainzAlbumSummary);
  const match = findMusicBrainzAlbumMatch(spotifyAlbum, candidates);

  if (!match?.id) {
    return null;
  }

  const group = await musicBrainzFetch(`/release-group/${match.id}`, {
    inc: "artist-credits+genres+tags+url-rels",
  });

  if (!group) {
    return null;
  }

  const release = await getRepresentativeMusicBrainzRelease(match.id);
  return mapMusicBrainzAlbumDetails(group, release);
};

const mergeAlbumGenres = (spotifyGenres, musicBrainzGenres) => {
  const merged = [];
  const seen = new Set();

  for (const genre of [...(spotifyGenres || []), ...(musicBrainzGenres || [])]) {
    const key = normalizeText(genre);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(genre);
  }

  return merged;
};

export const enrichSpotifyAlbumDetails = async (albumDetails) => {
  if (!albumDetails?.title || !albumDetails?.artist) {
    return albumDetails;
  }

  try {
    const musicBrainzAlbum = await getMusicBrainzAlbumDetails(albumDetails);
    if (!musicBrainzAlbum) {
      return albumDetails;
    }

    return {
      ...albumDetails,
      release_date: albumDetails.release_date || musicBrainzAlbum.release_date || "",
      track_count: albumDetails.track_count || musicBrainzAlbum.track_count || null,
      label: albumDetails.label || musicBrainzAlbum.label || "",
      genres: mergeAlbumGenres(albumDetails.genres, musicBrainzAlbum.genres),
      runtime_ms: albumDetails.runtime_ms || musicBrainzAlbum.runtime_ms || null,
      credits: albumDetails.credits?.length ? albumDetails.credits : musicBrainzAlbum.credits,
    };
  } catch (error) {
    console.error("MusicBrainz enrichment failed", error);
    return albumDetails;
  }
};

export const getEnrichedSpotifyAlbumPayload = async (albumId) => {
  const data = await spotifyFetch(`/albums/${encodeURIComponent(albumId)}?market=US`);
  if (!data) {
    return { tracks: [], album: null };
  }

  const tracks = (data.tracks?.items || []).map((track) => ({
    position: track.track_number,
    title: track.name,
  }));
  const album = await enrichSpotifyAlbumDetails(mapSpotifyAlbumDetails(data));
  return { tracks, album };
};
