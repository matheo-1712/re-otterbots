import { Events } from 'discord.js';
import { guardMessage } from '../../otterguard/guardMessage';
import { defineEvent } from '../defineEvent';

// OtterGuard : vérifie à nouveau un message quand son contenu est modifié
export default defineEvent({
	name: Events.MessageUpdate,
	async execute(oldMessage, newMessage, bot) {
		// Discord émet aussi une modification quand un aperçu de lien apparaît : on ignore si le texte n'a pas changé
		if (oldMessage.content === newMessage.content) {
			return;
		}

		await guardMessage(newMessage, bot, true);
	},
});
