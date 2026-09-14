import { join } from 'node:path';
import { Client, GatewayIntentBits } from 'discord.js';
import { printConnecting, releaseWarnings } from './display/banner';
import { type OtterbotsEvent, registerEvents } from './events/defineEvent';
import { loadEventsFromDirectory } from './events/loadEvents';

export { defineEvent, type OtterbotsEvent } from './events/defineEvent';

export class Otterbots {
	// Token du bot
	private readonly token: string;

	// Client Discord
	private readonly client: Client;

	// Sans intents fournis, le bot se contente de Guilds (connexion + liste des serveurs)
	constructor(token: string, intents: GatewayIntentBits[] = [GatewayIntentBits.Guilds]) {
		if (!token) {
			throw new Error('Le token du bot Discord est manquant.');
		}

		this.token = token;
		this.client = new Client({ intents });
		this.loadEvents(join(__dirname, 'events', 'builtin'));
	}

	// Enregistre tous les events d'un dossier (à appeler avant start)
	loadEvents(directory: string): this {
		registerEvents(this.client, loadEventsFromDirectory(directory));
		return this;
	}

	// Ajoute des events un par un (à appeler avant start)
	addEvents(...events: OtterbotsEvent[]): this {
		registerEvents(this.client, events);
		return this;
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
		await this.client.destroy();
	}
}
