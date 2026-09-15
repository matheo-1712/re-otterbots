import { Events } from 'discord.js';
import { guardMessage } from '../../otterguard/guardMessage';
import { defineEvent } from '../defineEvent';

// OtterGuard : vérifie chaque nouveau message
export default defineEvent({
	name: Events.MessageCreate,
	async execute(message, bot) {
		await guardMessage(message, bot);
	},
});
