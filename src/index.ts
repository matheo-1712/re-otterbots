import { join } from 'node:path';
import { Client, GatewayIntentBits } from 'discord.js';
import { BotApi, type BotApiOptions, type BotStatus } from './api/botApi';
import { type ConfigFileOptions, ConfigStore } from './config/configStore';
import { printConnecting, releaseWarnings } from './display/banner';
import { type OtterbotsEvent, registerEvents } from './events/defineEvent';
import { loadEventsFromDirectory } from './events/loadEvents';
import { DiscordLogs } from './logs/discordLogs';
import { createBotConnections } from './web/botConnection';
import { WebPanel, type WebPanelOptions } from './web/webPanel';

export { defineEvent, type OtterbotsEvent } from './events/defineEvent';
export type {
	BlockedPattern,
	AntiSpamConfig,
	BlockedPatternInput,
	ConfigFileOptions,
	OtterbotsConfig,
	OtterguardSettings,
} from './config/configStore';
export type { LogLevel, LogMessage } from './logs/discordLogs';
export type { BotApiOptions, BotStatus } from './api/botApi';
export type { OtterguardState } from './api/otterguardPayload';
export type { BotConnection, BotSummary, RemoteBotOptions } from './web/botConnection';
export type { WebPanelOptions, WebPanelServerOptions } from './web/webPanel';
export { createBotConnections } from './web/botConnection';
export { loadPanelBots } from './web/panelConfig';
// Pour lancer une interface web seule, sans bot dans le même process
export { WebPanel } from './web/webPanel';

export class Otterbots {
	// Token du bot
	private readonly token: string;

	// Client Discord
	private readonly client: Client;

	// Configuration YAML, rechargée à chaud
	readonly config = new ConfigStore();

	// Envoi de logs dans les salons définis par la configuration
	readonly logs: DiscordLogs;

	// Interface web de configuration, lancée par startWebPanel
	private webPanel: WebPanel | null = null;

	// API pour être piloté par un panneau lancé sur un autre service, lancée par startApi
	private api: BotApi | null = null;

	// Sans intents fournis, le bot se contente de Guilds (connexion + liste des serveurs)
	constructor(token: string, intents: GatewayIntentBits[] = [GatewayIntentBits.Guilds]) {
		if (!token) {
			throw new Error('Le token du bot Discord est manquant.');
		}

		this.token = token;
		this.client = new Client({ intents });
		this.logs = new DiscordLogs(this.client, this.config);
		this.loadEvents(join(__dirname, 'events', 'builtin'));
	}

	// État de la connexion à Discord
	get status(): BotStatus {
		const { user } = this.client;
		return {
			ready: this.client.isReady(),
			tag: user?.tag ?? null,
			id: user?.id ?? null,
			avatarUrl: user?.displayAvatarURL({ size: 128 }) ?? null,
			guilds: this.client.guilds.cache.size,
		};
	}

	// Adresse de l'interface web, null si elle n'est pas lancée
	get webPanelUrl(): string | null {
		return this.webPanel?.url ?? null;
	}

	// Adresse de l'API, null si elle n'est pas lancée
	get apiUrl(): string | null {
		return this.api?.url ?? null;
	}

	// Définit le fichier YAML de configuration du bot : chemin et comportement au choix (voir ConfigFileOptions)
	loadConfig(filePath: string, options?: ConfigFileOptions): this {
		this.config.load(filePath, options);
		return this;
	}

	// Enregistre tous les events d'un dossier (à appeler avant start)
	loadEvents(directory: string): this {
		registerEvents(this, this.client, loadEventsFromDirectory(directory));
		return this;
	}

	// Ajoute des events un par un (à appeler avant start)
	addEvents(...events: OtterbotsEvent[]): this {
		registerEvents(this, this.client, events);
		return this;
	}

	// Lance l'interface web, pour ce bot et les bots distants donnés. Avant ou après start
	async startWebPanel(options: WebPanelOptions = {}): Promise<void> {
		const { bots = [], ...serverOptions } = options;
		await this.webPanel?.stop();

		const panel = new WebPanel(createBotConnections(this, bots), serverOptions);
		await panel.start();
		this.webPanel = panel;

		// Bot déjà connecté : l'adresse n'apparaîtra pas dans l'écran de connexion
		if (this.client.isReady()) {
			console.log(`Interface web : ${panel.url}`);
		}
	}

	// Lance l'API qui permet à un panneau d'un autre service de configurer ce bot. Avant ou après start
	async startApi(options: BotApiOptions): Promise<void> {
		await this.api?.stop();

		const api = new BotApi(this, options);
		await api.start();
		this.api = api;

		if (this.client.isReady()) {
			console.log(`API : ${api.url}`);
		}
	}

	// Démarre le bot
	async start(): Promise<void> {
		printConnecting();

		try {
			await this.client.login(this.token);
		}
		catch (error) {
			// La bannière ne s'affichera pas : on libère les avertissements pour ne pas les perdre
			releaseWarnings();
			throw error;
		}
	}

	// Arrête proprement le bot
	async stop(): Promise<void> {
		this.config.close();
		await Promise.all([this.webPanel?.stop(), this.api?.stop()]);
		this.webPanel = null;
		this.api = null;
		await this.client.destroy();
	}
}
