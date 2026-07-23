import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { spotifyFetch } from "../../shared/spotify.ts";

const mapAlbum = (a) => ({
  id: a.id,
  title: a.name,
  artist: (a.artists || []).map((ar) => ar.name).join(", "),
  release_year: (a.release_date || "").slice(0, 4),
  album_type: a.album_type || "album",
  artwork_url:
    (a.images || []).find((i) => i.width >= 300)?.url ||
    a.images?.[0]?.url ||
    "",
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = body?.query?.trim();
    if (!query) return Response.json({ albums: [] });

    // 1. Album search (dev mode caps search at 10 results)
    const searchData = await spotifyFetch(
      `/search?q=${encodeURIComponent(query)}&type=album&limit=10&market=US`,
    );
    const albums = (searchData.albums?.items || []).map(mapAlbum);

    // 2. Find the top artist match and pull their EPs/singles, which the
    //    popularity-ranked search often buries below the 10-result cutoff.
    let artistAlbums = [];
    try {
      const artistSearch = await spotifyFetch(
        `/search?q=${encodeURIComponent(query)}&type=artist&limit=1&market=US`,
      );
      const artist = artistSearch.artists?.items?.[0];
      if (artist) {
        const discography = await spotifyFetch(
          `/artists/${artist.id}/albums?include_groups=album,single,compilation&limit=50&market=US`,
        );
        artistAlbums = (discography.items || []).map(mapAlbum);
      }
    } catch (_e) {
      // artist lookup is best-effort; fall back to search results only
    }

    // Merge + dedupe by id; search results first, then artist EPs/singles
    const seen = new Set();
    const merged = [];
    for (const a of [...albums, ...artistAlbums]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        merged.push(a);
      }
    }

    return Response.json({ albums: merged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});