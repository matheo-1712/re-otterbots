import { Events } from 'discord.js';
import { defineEvent } from '../defineEvent';

// Sans listener sur « error », Node.js ferait planter le process
export default defineEvent({
	name: Events.Error,
	execute(error) {
		console.error('[discord.js]', error);
	},
});
