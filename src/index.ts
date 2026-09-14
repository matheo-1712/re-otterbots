import { Client, Events, GatewayIntentBits } from 'discord.js';
import { printConnecting, printReadyBanner } from './display/banner';

export class Otterbots {
	// Token du bot
	private readonly token: string;

	// Client Discord
	private readonly client: Client;

	// Horodatage du lancement, pour mesurer le temps de connexion
	private startedAt = 0;

	constructor(token: string) {
		if (!token) {
			throw new Error('Le token du bot Discord est manquant.');
		}

		this.token = token;
		this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
		this.registerEvents();
	}

	// Démarre le bot
	async start(): Promise<void> {
		this.startedAt = Date.now();
		printConnecting();
		await this.client.login(this.token);
	}

	// Arrête proprement le bot
	async stop(): Promise<void> {
		await this.client.destroy();
	}

	// Branche les événements de base du client
	private registerEvents(): void {
		this.client.once(Events.ClientReady, (readyClient) => {
			printReadyBanner(readyClient, Date.now() - this.startedAt);
		});

		this.client.on(Events.Warn, (message) => {
			console.warn('[discord.js]', message);
		});

		this.client.on(Events.Error, (error) => {
			console.error('[discord.js]', error);
		});
	}
}
