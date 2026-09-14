import { Otterbots } from './index';

// Charge le .env s'il existe, sinon on s'appuie sur les variables d'environnement
function loadToken(): string {
	try {
		process.loadEnvFile();
	}
	catch {
		// Pas de fichier .env : rien à faire
	}

	const token = process.env.BOT_TOKEN;
	if (!token) {
		console.error('BOT_TOKEN est absent. Copie .env.example vers .env et renseigne le token.');
		process.exit(1);
	}

	return token;
}

const bot = new Otterbots(loadToken());

// Déconnecte le bot avant de quitter (Ctrl+C, arrêt du conteneur…)
async function shutdown(signal: NodeJS.Signals): Promise<void> {
	console.log(`${signal} reçu, arrêt du bot…`);
	await bot.stop();
	process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
	console.error('Promesse rejetée non gérée :', reason);
});

bot.start().catch((error: unknown) => {
	console.error('Impossible de démarrer le bot :', error);
	process.exit(1);
});
