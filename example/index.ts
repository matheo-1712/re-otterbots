import { existsSync } from 'node:fs';
import { GatewayIntentBits } from 'discord.js';
// Dans un vrai bot : import { Otterbots, loadPanelBots } from 're-otterbots';
import { Otterbots, loadPanelBots } from '../src';

// Toute la configuration est ici, côté bot : la librairie ne lit ni .env ni fichier d'elle-même

// Charge le .env s'il existe, sinon on s'appuie sur les variables d'environnement
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

// MessageContent est privilégié : il doit aussi être activé sur le Developer Portal
const bot = new Otterbots(token, [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
]);

// Configuration du bot (logs, OtterGuard), rechargée à chaud et modifiable depuis l'interface web.
// Chemin au choix avec CONFIG_FILE, sinon otterbots.yml à la racine du projet (à côté du .env), créé s'il n'existe pas
bot.loadConfig(process.env.CONFIG_FILE || 'otterbots.yml', { ifMissing: 'create' });

// Le bot fonctionne sans l'interface ni l'API : une erreur est affichée et on continue
function reportOptionalStartError(label: string) {
	return (error: unknown) => {
		console.error(`Impossible de lancer ${label} :`, error instanceof Error ? error.message : error);
	};
}

// Interface web (http://127.0.0.1:3000 par défaut) : ce bot et les bots distants listés dans
// PANEL_CONFIG_FILE (panel.yml à la racine du projet par défaut), s'il existe. Désactivable avec WEB_PANEL=false
async function startWebPanel(): Promise<void> {
	const panelConfigPath = process.env.PANEL_CONFIG_FILE || 'panel.yml';

	await bot.startWebPanel({
		port: Number(process.env.WEB_PORT) || undefined,
		host: process.env.WEB_HOST || undefined,
		password: process.env.WEB_PASSWORD || undefined,
		bots: existsSync(panelConfigPath) ? loadPanelBots(panelConfigPath) : [],
	});
}

if (process.env.WEB_PANEL !== 'false') {
	startWebPanel().catch(reportOptionalStartError('l\'interface web'));
}

// API pour configurer ce bot depuis un panneau lancé sur un autre service, seulement si API_TOKEN est défini
if (process.env.API_TOKEN) {
	bot.startApi({
		token: process.env.API_TOKEN,
		port: Number(process.env.API_PORT) || undefined,
		host: process.env.API_HOST || undefined,
	}).catch(reportOptionalStartError('l\'API'));
}

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
