import { join } from 'node:path';
import { Client, GatewayIntentBits } from 'discord.js';
import { BotApi, type BotApiOptions, type BotStatus } from './api/botApi';
import { type ConfigFileOptions, ConfigStore } from './config/configStore';
import { printConnecting, releaseWarnings } from './display/banner';
import { type OtterbotsEvent, registerEvents } from './events/defineEvent';
import { loadEventsFromDirectory } from './events/loadEvents';
import { DiscordLogs } from './logs/discordLogs';
import {
	apiOptionsFromEnv,
	configFileFromEnv,
	describeError,
	handleProcessEvents,
	loadEnv,
	panelBotsFromEnv,
	reportOptionalError,
	webPanelEnabledFromEnv,
	webPanelOptionsFromEnv,
} from './runtime/run';
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
export { runWebPanel } from './runtime/run';

export interface OtterbotsOptions {
	// Token du bot. Par défaut : la variable d'environnement BOT_TOKEN, lue au démarrage
	token?: string;
	// Intents du client. Par défaut : Guilds, GuildMessages et MessageContent (nécessaires à OtterGuard)
	intents?: GatewayIntentBits[];
}

// MessageContent est privilégié : il doit aussi être activé sur le Developer Portal
const DEFAULT_INTENTS = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
];

export class Otterbots {
	// Token du bot, sinon BOT_TOKEN au démarrage
	private readonly token: string | undefined;

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

	constructor(options?: OtterbotsOptions);
	constructor(token: string, intents?: GatewayIntentBits[]);
	constructor(tokenOrOptions: string | OtterbotsOptions = {}, intents?: GatewayIntentBits[]) {
		const options = typeof tokenOrOptions === 'string' ? { token: tokenOrOptions, intents } : tokenOrOptions;

		this.token = options.token || undefined;
		this.client = new Client({ intents: options.intents ?? DEFAULT_INTENTS });
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

	// Connecte le bot, avec le token donné au constructeur ou BOT_TOKEN
	async start(): Promise<void> {
		const token = this.token ?? process.env.BOT_TOKEN;
		if (!token) {
			throw new Error('BOT_TOKEN est absent. Ajoute BOT_TOKEN=ton_token dans le fichier .env à la racine du projet.');
		}

		printConnecting();

		try {
			await this.client.login(token);
		}
		catch (error) {
			// La bannière ne s'affichera pas : on libère les avertissements pour ne pas les perdre
			releaseWarnings();
			throw error;
		}
	}

	// Lance tout, réglé par le .env : configuration, interface web, API, connexion et arrêt propre.
	// Si le bot ne peut pas se connecter, l'erreur est affichée et le process s'arrête
	async run(): Promise<void> {
		try {
			loadEnv();
			handleProcessEvents(() => this.stop());

			// Fichier déjà choisi avec loadConfig : on le garde
			if (!this.config.persistent) {
				this.loadConfig(configFileFromEnv(), { ifMissing: 'create' });
			}

			// Le bot fonctionne sans l'interface ni l'API : en cas d'échec, l'erreur est affichée et on continue
			if (webPanelEnabledFromEnv() && !this.webPanel) {
				const startWebPanel = async (): Promise<void> => {
					await this.startWebPanel({ ...webPanelOptionsFromEnv(), bots: panelBotsFromEnv() });
				};
				startWebPanel().catch(reportOptionalError('l\'interface web'));
			}

			const apiOptions = apiOptionsFromEnv();
			if (apiOptions && !this.api) {
				this.startApi(apiOptions).catch(reportOptionalError('l\'API'));
			}

			await this.start();
		}
		catch (error) {
			console.error('Impossible de démarrer le bot :', describeError(error));
			process.exit(1);
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
