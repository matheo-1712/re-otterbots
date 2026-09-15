import { Events } from 'discord.js';
import { printReadyBanner } from '../../display/banner';
import { defineEvent } from '../defineEvent';

// Affiche l'écran d'accueil une fois le bot connecté
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	execute(client, bot) {
		// Temps écoulé depuis le lancement du process
		printReadyBanner(client, Math.round(performance.now()), {
			'Interface web': bot.webPanelUrl,
			'API': bot.apiUrl,
		});
	},
});
