import type { Message } from 'discord.js';
import type { Otterbots } from '../index';
import { handleSpam } from './antiSpam';
import { truncateForLog } from './format';

// Vérifie un message, nouveau ou modifié : anti-spam (nouveaux messages), puis motifs bloqués.
// Sans configuration, ne fait rien
export async function guardMessage(message: Message, bot: Otterbots, edited = false): Promise<void> {
	// Messages privés, webhooks et messages du bot lui-même ignorés
	if (!message.inGuild() || message.webhookId !== null || message.author.id === message.client.user.id) {
		return;
	}

	const { enabled, consoleLog, blockedPatterns, exemptRoles } = bot.config.current.otterguard;
	if (!enabled) {
		return;
	}

	const memberRoles = message.member?.roles.cache;
	if (memberRoles && exemptRoles.some((roleId) => memberRoles.has(roleId))) {
		return;
	}

	// Une modification ne change pas de salon : seuls les nouveaux messages comptent pour l'anti-spam
	if (!edited && await handleSpam(message, bot)) {
		return;
	}

	// Les autres bots ne sont concernés que par l'anti-spam
	if (message.author.bot || blockedPatterns.length === 0) {
		return;
	}

	const match = blockedPatterns.find((pattern) => pattern.regex.test(message.content));
	if (!match) {
		return;
	}

	// Sans la permission « Gérer les messages », l'erreur est affichée par registerEvent
	await message.delete();

	// Trace courte dans la console du bot, même sans salon de logs : des IDs, jamais le contenu du message
	// (les logs du service sont souvent conservés longtemps et lisibles par des non-modérateurs)
	if (consoleLog) {
		console.log(
			`[otterguard] Message ${edited ? 'modifié ' : ''}supprimé · serveur ${message.guildId}`
			+ ` · salon ${message.channelId} · auteur ${message.author.id} · motif « ${match.reason ?? match.source} »`,
		);
	}

	// Log uniquement si un salon otterguard est configuré
	if (!bot.config.getLogChannel('otterguard')) {
		return;
	}

	await bot.logs.send('otterguard', {
		level: 'warn',
		title: edited ? 'Message modifié bloqué' : 'Message bloqué',
		description: truncateForLog(message.content),
		fields: [
			{ name: 'Auteur', value: `${message.author} (${message.author.tag})`, inline: true },
			{ name: 'Salon', value: `${message.channel}`, inline: true },
			{ name: 'Motif', value: match.reason ?? `\`${match.source}\`` },
		],
	});
}
