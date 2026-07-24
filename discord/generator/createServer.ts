import { loadConfig } from "./loadConfig.js";
import { ChannelType, Guild } from "discord.js";
import { client, loginBot } from "./discordClient.js";

async function createCategory(guild: Guild, name: string) {
    const existing = guild.channels.cache.find(
        channel =>
            channel.type === ChannelType.GuildCategory &&
            channel.name === name
    );

    if (existing) {
        console.log(`✅ Category "${name}" already exists.`);
        return;
    }

    await guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
    });

    console.log(`🎉 Created category "${name}"`);
}

async function createTextChannel(
    guild: Guild,
    categoryName: string,
    channelName: string
) {
    const existing = guild.channels.cache.find(
        channel => channel.name === channelName
    );

    if (existing) {
        console.log(`✅ Channel "${channelName}" already exists.`);
        return;
    }

    const category = guild.channels.cache.find(
        channel =>
            channel.type === ChannelType.GuildCategory &&
            channel.name === categoryName
    );

    if (!category) {
        throw new Error(`Category "${categoryName}" not found.`);
    }

    await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id
    });

    console.log(`💬 Created channel "${channelName}"`);
}

async function createRole(
    guild: Guild,
    roleName: string
) {
    const existing = guild.roles.cache.find(
        role => role.name === roleName
    );

    if (existing) {
        console.log(`✅ Role "${roleName}" already exists.`);
        return;
    }

    await guild.roles.create({
        name: roleName
    });

    console.log(`🛡️ Created role "${roleName}"`);
}

async function main() {
    await loginBot();

    const guild = await client.guilds.fetch(
        client.guilds.cache.first()!.id
    );

    console.log(`Connected to: ${guild.name}`);

    const config = loadConfig();

    // Create roles
    for (const role of config.roles) {
        await createRole(guild, role);
    }

    // Create categories and channels
    for (const category of config.categories) {
        await createCategory(guild, category.name);

        for (const channel of category.channels) {
            await createTextChannel(
                guild,
                category.name,
                channel
            );
        }
    }
}

main().catch(console.error);