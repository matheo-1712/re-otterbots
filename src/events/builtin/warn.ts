import { Events } from 'discord.js';
import { printWarning } from '../../display/banner';
import { defineEvent } from '../defineEvent';

// Avertissements non bloquants remontés par discord.js, affichés sous l'écran de connexion
export default defineEvent({
	name: Events.Warn,
	execute(message) {
		printWarning(message);
	},
});
