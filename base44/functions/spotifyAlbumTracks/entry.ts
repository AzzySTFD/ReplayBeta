import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { spotifyFetch } from "../../shared/spotify.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const albumId = body?.albumId;
    if (!albumId) return Response.json({ tracks: [] });

    const data = await spotifyFetch(`/albums/${albumId}?market=US`);
    const tracks = (data.tracks?.items || []).map((t) => ({
      position: t.track_number,
      title: t.name,
    }));
    return Response.json({ tracks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});