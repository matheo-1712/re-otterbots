import { Otterbots } from '../src';

process.loadEnvFile();

const token = process.env.BOT_TOKEN;
if (!token) {
	throw new Error('BOT_TOKEN est absent du fichier .env');
}

const bot = new Otterbots(token);
bot.start().catch((error: unknown) => {
	console.error('Impossible de démarrer le bot :', error);
	process.exit(1);
});
