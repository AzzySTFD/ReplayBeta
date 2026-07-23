import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isAlbumFeatured } from '../../shared/featured.ts';

const DISCORD_API = 'https://discord.com/api/v10';
const CONNECTOR_ID = '6a6061d40f3fcf90dbdbd842';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { album_title, artist } = body;
    if (!album_title || !artist) {
      return Response.json({ error: 'album_title and artist required' }, { status: 400 });
    }

    // Get user's profile for Discord channel
    const profiles = await db.entities.Profile.filter({ created_by_id: user.id });
    const profile = profiles[0];
    if (!profile || !profile.discord_channel_id) {
      return Response.json({ shared: false, reason: 'no_discord_channel' });
    }

    // Fetch all reviews and check if this album is featured
    const allReviews = await db.entities.Review.list('-created_date', 1000);
    const { featured, count, avg, album_art_url } = isAlbumFeatured(allReviews, album_title, artist);
    if (!featured) {
      return Response.json({ shared: false, reason: 'not_featured', count, avg });
    }

    // Check if already shared by this user (prevent duplicates)
    const existing = await db.entities.FeaturedShare.filter({
      created_by_id: user.id,
      album_title: album_title,
      artist: artist,
    });
    if (existing.length > 0) {
      return Response.json({ shared: false, reason: 'already_shared' });
    }

    // Get Discord connection
    const { accessToken } = await db.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Post to Discord
    const messageBody = {
      embeds: [{
        title: `🎵 Featured Album: ${album_title}`,
        description: `**${artist}**\n\n⭐ **${avg}/10** from ${count} ratings\n\nThis album just reached featured status on Track by Track!`,
        color: 0x8B5CF6,
        footer: { text: 'Track by Track' },
        ...(album_art_url ? { thumbnail: { url: album_art_url } } : {}),
      }],
    };

    const msgResp = await fetch(`${DISCORD_API}/channels/${profile.discord_channel_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    if (!msgResp.ok) {
      const errText = await msgResp.text();
      return Response.json({ error: `Discord API error: ${errText}` }, { status: 502 });
    }

    // Record the share
    await db.entities.FeaturedShare.create({ album_title, artist });

    return Response.json({ shared: true, count, avg });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});