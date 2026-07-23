import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeFeaturedAlbums } from '../../shared/featured.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const reviews = await db.entities.Review.list('-created_date', 1000);
    const featured = computeFeaturedAlbums(reviews);
    return Response.json({ featured });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});