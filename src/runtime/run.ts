import { existsSync } from 'node:fs';
import type { BotApiOptions } from '../api/botApi';
import { type RemoteBotOptions, createBotConnections } from '../web/botConnection';
import { loadPanelBots } from '../web/panelConfig';
import { WebPanel, type WebPanelServerOptions } from '../web/webPanel';

// Lancement « clé en main » : tout se règle avec des variables d'environnement (voir .env.example)

// Charge le .env du dossier courant s'il existe. Les variables déjà définies (Docker, hébergeur) sont conservées
export function loadEnv(): void {
	try {
		process.loadEnvFile();
	}
	catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
}

// Une variable vide compte comme absente
function readEnv(name: string): string | undefined {
	return process.env[name] || undefined;
}

export function configFileFromEnv(): string {
	return readEnv('CONFIG_FILE') ?? 'otterbots.yml';
}

export function webPanelEnabledFromEnv(): boolean {
	return process.env.WEB_PANEL !== 'false';
}

export function webPanelOptionsFromEnv(): WebPanelServerOptions {
	return {
		port: Number(process.env.WEB_PORT) || undefined,
		host: readEnv('WEB_HOST'),
		password: readEnv('WEB_PASSWORD'),
	};
}

function panelConfigFileFromEnv(): string {
	return readEnv('PANEL_CONFIG_FILE') ?? 'panel.yml';
}

// Bots distants listés dans PANEL_CONFIG_FILE (panel.yml par défaut), aucun si le fichier n'existe pas
export function panelBotsFromEnv(): RemoteBotOptions[] {
	const filePath = panelConfigFileFromEnv();
	return existsSync(filePath) ? loadPanelBots(filePath) : [];
}

// null si API_TOKEN n'est pas défini : l'API n'est pas lancée
export function apiOptionsFromEnv(): BotApiOptions | null {
	const token = readEnv('API_TOKEN');
	if (!token) {
		return null;
	}

	return {
		token,
		port: Number(process.env.API_PORT) || undefined,
		host: readEnv('API_HOST'),
	};
}

// Message lisible pour les erreurs de démarrage les plus courantes
export function describeError(error: unknown): string {
	const code = (error as { code?: unknown } | null)?.code;

	if (code === 'TokenInvalid') {
		return 'le token est invalide. Vérifie BOT_TOKEN dans le .env.';
	}
	if (code === 'DisallowedIntents') {
		return 'un intent privilégié n\'est pas activé. Active « Message Content Intent » dans l\'onglet Bot du Developer Portal.';
	}

	return error instanceof Error ? error.message : String(error);
}

// Pour ce qui est facultatif (interface web, API) : l'erreur est affichée et le reste continue
export function reportOptionalError(label: string): (error: unknown) => void {
	return (error) => {
		console.error(`Impossible de lancer ${label} :`, describeError(error));
	};
}

// Arrêt propre sur Ctrl+C ou arrêt du conteneur, et affichage des promesses rejetées non gérées
export function handleProcessEvents(stop: () => Promise<void>): void {
	const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
		console.log(`${signal} reçu, arrêt…`);
		try {
			await stop();
		}
		finally {
			process.exit(0);
		}
	};

	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);

	process.on('unhandledRejection', (reason) => {
		console.error('Promesse rejetée non gérée :', reason);
	});
}

// Interface web seule, sans bot : pilote les bots distants listés dans PANEL_CONFIG_FILE (panel.yml par défaut)
export async function runWebPanel(): Promise<WebPanel> {
	try {
		loadEnv();

		const filePath = panelConfigFileFromEnv();
		if (!existsSync(filePath)) {
			throw new Error(`${filePath} est absent. Crée-le (voir panel.example.yml) et liste les bots à piloter.`);
		}

		const bots = loadPanelBots(filePath);
		if (bots.length === 0) {
			throw new Error(`${filePath} ne liste aucun bot`);
		}

		const panel = new WebPanel(createBotConnections(null, bots), webPanelOptionsFromEnv());
		await panel.start();
		console.log(`Interface web : ${panel.url} (${bots.length} bot${bots.length > 1 ? 's' : ''})`);

		handleProcessEvents(() => panel.stop());
		return panel;
	}
	catch (error) {
		console.error('Impossible de lancer l\'interface web :', describeError(error));
		process.exit(1);
	}
}
