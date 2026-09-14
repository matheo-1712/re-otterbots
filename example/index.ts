import { Otterbots } from '../src';
import {GatewayIntentBits} from "discord.js";

process.loadEnvFile();

const token = process.env.BOT_TOKEN;
if (!token) {
	throw new Error('BOT_TOKEN est absent du fichier .env');
}

const bot = new Otterbots(token, [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]);
bot.start().catch((error: unknown) => {
	console.error('Impossible de démarrer le bot :', error);
	process.exit(1);
});
