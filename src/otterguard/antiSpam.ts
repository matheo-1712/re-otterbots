import { type Message, RESTJSONErrorCodes } from 'discord.js';
import type { Otterbots } from '../index';
import { truncateForLog } from './format';

interface TrackedMessage {
	channelId: string;
	messageId: string;
	sentAt: number;
}

interface AuthorActivity {
	// Messages récents de l'auteur, dans la fenêtre de temps de l'anti-spam
	messages: TrackedMessage[];
	// Jusqu'à quand les messages de l'auteur sont supprimés d'office (spam en cours)
	blockedUntil: number;
}

// Nombre de messages traités entre deux nettoyages des auteurs inactifs
const SWEEP_INTERVAL = 500;

// Salons listés au maximum dans le log Discord (limite d'un champ : 1024 caractères)
const MAX_LOGGED_CHANNELS = 20;

// Activité récente des auteurs, par serveur
class SpamTracker {
	private readonly authors = new Map<string, AuthorActivity>();
	private messagesSinceSweep = 0;

	// Ajoute le message à l'activité de son auteur et oublie les messages sortis de la fenêtre
	record(message: Message<true>, windowMs: number, now: number): AuthorActivity {
		this.sweep(windowMs, now);

		const key = `${message.guildId}:${message.author.id}`;
		const activity = this.authors.get(key) ?? { messages: [], blockedUntil: 0 };

		activity.messages = activity.messages.filter(({ sentAt }) => now - sentAt <= windowMs);
		activity.messages.push(toTracked(message, now));
		this.authors.set(key, activity);

		return activity;
	}

	// Oublie régulièrement les auteurs inactifs, pour que la mémoire ne grossisse pas indéfiniment
	private sweep(windowMs: number, now: number): void {
		if (++this.messagesSinceSweep < SWEEP_INTERVAL) {
			return;
		}

		this.messagesSinceSweep = 0;
		for (const [key, activity] of this.authors) {
			const lastSentAt = activity.messages.at(-1)?.sentAt ?? 0;
			if (activity.blockedUntil <= now && now - lastSentAt > windowMs) {
				this.authors.delete(key);
			}
		}
	}
}

// Un suivi par bot : plusieurs instances d'Otterbots dans le même process ne se mélangent pas
const trackers = new WeakMap<Otterbots, SpamTracker>();

function getTracker(bot: Otterbots): SpamTracker {
	let tracker = trackers.get(bot);
	if (!tracker) {
		tracker = new SpamTracker();
		trackers.set(bot, tracker);
	}
	return tracker;
}

function toTracked(message: Message<true>, now: number): TrackedMessage {
	return { channelId: message.channelId, messageId: message.id, sentAt: now };
}

// Un message déjà supprimé (par un modérateur, un motif bloqué…) compte comme supprimé
async function deleteTracked(message: Message<true>, tracked: TrackedMessage): Promise<boolean> {
	const channel = message.guild.channels.cache.get(tracked.channelId);
	if (!channel?.isTextBased()) {
		return false;
	}

	try {
		await channel.messages.delete(tracked.messageId);
		return true;
	}
	catch (error) {
		return (error as { code?: unknown }).code === RESTJSONErrorCodes.UnknownMessage;
	}
}

// false si l'exclusion est désactivée ou impossible (permission, rôle de l'auteur plus haut que celui du bot…)
async function timeoutAuthor(message: Message<true>, minutes: number): Promise<boolean> {
	const { member } = message;
	if (minutes === 0 || !member?.moderatable) {
		return false;
	}

	try {
		await member.timeout(minutes * 60_000, 'OtterGuard : spam dans plusieurs salons');
		return true;
	}
	catch (error) {
		console.error('[otterguard] Exclusion temporaire impossible :', error);
		return false;
	}
}

// Anti-spam : un même auteur (bots compris) qui écrit dans plusieurs salons en peu de temps.
// Renvoie true si le message fait partie d'un spam : il est alors supprimé
export async function handleSpam(message: Message<true>, bot: Otterbots): Promise<boolean> {
	const { antiSpam, consoleLog } = bot.config.current.otterguard;
	if (!antiSpam.enabled) {
		return false;
	}

	const now = Date.now();
	const windowMs = antiSpam.seconds * 1000;
	// Enregistré avant tout await : les messages arrivés pendant le traitement voient déjà le blocage
	const activity = getTracker(bot).record(message, windowMs, now);

	// Spam déjà signalé : les messages suivants sont supprimés sans nouvelle sanction ni nouveau log
	if (activity.blockedUntil > now) {
		activity.blockedUntil = now + windowMs;
		activity.messages = [];
		await deleteTracked(message, toTracked(message, now));
		return true;
	}

	const channelIds = new Set(activity.messages.map(({ channelId }) => channelId));
	if (channelIds.size < antiSpam.channels) {
		return false;
	}

	// Spam détecté : toute la rafale est supprimée
	activity.blockedUntil = now + windowMs;
	const burst = activity.messages;
	activity.messages = [];

	const results = await Promise.all(burst.map((tracked) => deleteTracked(message, tracked)));
	const deleted = results.filter(Boolean).length;
	const timedOut = await timeoutAuthor(message, antiSpam.timeoutMinutes);

	let sanction = 'aucune exclusion';
	if (antiSpam.timeoutMinutes > 0) {
		sanction = timedOut ? `exclu ${antiSpam.timeoutMinutes} min` : 'exclusion impossible (permission ou rôle trop haut)';
	}
	const action = `${deleted}/${burst.length} messages supprimés · ${sanction}`;

	// Comme pour les motifs : des IDs en console, jamais le contenu du message
	if (consoleLog) {
		console.log(
			`[otterguard] Spam détecté · serveur ${message.guildId} · auteur ${message.author.id}`
			+ ` · ${channelIds.size} salons en moins de ${antiSpam.seconds} s · ${action}`,
		);
	}

	if (bot.config.getLogChannel('otterguard')) {
		const channels = [...channelIds];
		const listed = channels.slice(0, MAX_LOGGED_CHANNELS).map((id) => `<#${id}>`).join(' ');
		const hidden = channels.length - MAX_LOGGED_CHANNELS;

		await bot.logs.send('otterguard', {
			level: 'error',
			title: 'Spam dans plusieurs salons',
			description: truncateForLog(message.content),
			fields: [
				{ name: 'Auteur', value: `${message.author} (${message.author.tag})${message.author.bot ? ' · bot' : ''}`, inline: true },
				{ name: 'Salons', value: hidden > 0 ? `${listed} (+${hidden})` : listed, inline: true },
				{ name: 'Action', value: action },
			],
		});
	}

	return true;
}
