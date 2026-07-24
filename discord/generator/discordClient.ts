import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

export async function loginBot() {
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("❌ DISCORD_TOKEN is missing from your .env file.");
  }

  await client.login(token);

  console.log(`🤘 Logged in as ${client.user?.tag}`);
}