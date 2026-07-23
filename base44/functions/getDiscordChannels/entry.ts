import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DISCORD_API = 'https://discord.com/api/v10';
const CONNECTOR_ID = '6a6061d40f3fcf90dbdbd842';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await db.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const guildsResp = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guildsResp.ok) {
      return Response.json({ error: 'Failed to fetch Discord guilds' }, { status: 502 });
    }
    const guilds = await guildsResp.json();

    const result = [];
    for (const guild of guilds.slice(0, 25)) {
      try {
        const channelsResp = await fetch(`${DISCORD_API}/guilds/${guild.id}/channels`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!channelsResp.ok) continue;
        const channels = await channelsResp.json();
        const textChannels = channels
          .filter((c) => c.type === 0)
          .map((c) => ({ id: c.id, name: c.name }));
        if (textChannels.length > 0) {
          result.push({ id: guild.id, name: guild.name, channels: textChannels });
        }
      } catch (e) {
        // skip guild if channels fetch fails
      }
    }

    return Response.json({ guilds: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});