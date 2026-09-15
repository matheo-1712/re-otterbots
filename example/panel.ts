import { existsSync } from 'node:fs';
// Dans un vrai projet : import { WebPanel, createBotConnections, loadPanelBots } from 're-otterbots';
import { WebPanel, createBotConnections, loadPanelBots } from '../src';

// Interface web seule, sans bot : pilote les bots distants via leur API (npm run panel)

try {
	process.loadEnvFile();
}
catch {
	// Pas de fichier .env : rien à faire
}

// Chemin au choix avec PANEL_CONFIG_FILE, sinon panel.yml à la racine du projet (à côté du .env)
const configPath = process.env.PANEL_CONFIG_FILE || 'panel.yml';

async function main(): Promise<void> {
	if (!existsSync(configPath)) {
		throw new Error(`${configPath} est absent. Copie panel.example.yml et liste les bots à piloter.`);
	}

	const bots = loadPanelBots(configPath);
	if (bots.length === 0) {
		throw new Error(`${configPath} ne liste aucun bot`);
	}

	// null : pas de bot local, uniquement des bots distants
	const panel = new WebPanel(createBotConnections(null, bots), {
		port: Number(process.env.WEB_PORT) || undefined,
		host: process.env.WEB_HOST || undefined,
		password: process.env.WEB_PASSWORD || undefined,
	});

	await panel.start();
	console.log(`Interface web : ${panel.url} (${bots.length} bot${bots.length > 1 ? 's' : ''})`);

	const shutdown = async (): Promise<void> => {
		await panel.stop();
		process.exit(0);
	};

	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
	console.error('Impossible de lancer l\'interface web :', error instanceof Error ? error.message : error);
	process.exit(1);
});
