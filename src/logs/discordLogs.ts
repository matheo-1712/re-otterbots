import { type Client, EmbedBuilder, Events } from 'discord.js';
import type { ConfigStore } from '../config/configStore';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface LogMessage {
	level?: LogLevel;
	title: string;
	description?: string;
	fields?: { name: string; value: string; inline?: boolean }[];
}

const LEVELS: Record<LogLevel, { color: number; icon: string }> = {
	info: { color: 0x5865f2, icon: 'ℹ️' },
	success: { color: 0x57f287, icon: '✅' },
	warn: { color: 0xfee75c, icon: '⚠️' },
	error: { color: 0xed4245, icon: '⛔' },
};

export class DiscordLogs {
	private readonly client: Client;
	private readonly config: ConfigStore;

	constructor(client: Client, config: ConfigStore) {
		this.client = client;
		this.config = config;
	}

	// Envoie un log dans le salon configuré sous ce nom. Ne lève jamais d'erreur : renvoie false en cas d'échec
	async send(channelName: string, message: LogMessage): Promise<boolean> {
		// Le salon est relu à chaque envoi : un changement de configuration s'applique immédiatement
		const channelId = this.config.getLogChannel(channelName);
		if (!channelId) {
			console.warn(`[logs] Aucun salon configuré pour « ${channelName} » (logs.channels.${channelName})`);
			return false;
		}

		try {
			await this.waitUntilReady();

			const channel = await this.client.channels.fetch(channelId);
			if (!channel?.isSendable()) {
				console.warn(`[logs] Le bot ne peut pas écrire dans le salon ${channelId} (« ${channelName} »)`);
				return false;
			}

			const { color, icon } = LEVELS[message.level ?? 'info'];
			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle(`${icon} ${message.title}`)
				.setTimestamp();

			if (message.description) {
				embed.setDescription(message.description);
			}
			if (message.fields?.length) {
				embed.addFields(message.fields);
			}

			await channel.send({ embeds: [embed] });
			return true;
		}
		catch (error) {
			console.error(`[logs] Échec de l'envoi de « ${message.title} » dans « ${channelName} » :`, error);
			return false;
		}
	}

	// Un log demandé pendant la connexion part dès que le bot est prêt
	private waitUntilReady(): Promise<void> {
		if (this.client.isReady()) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			this.client.once(Events.ClientReady, () => resolve());
		});
	}
}
