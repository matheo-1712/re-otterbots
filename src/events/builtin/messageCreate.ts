import { Events } from 'discord.js';
import {defineEvent} from "../defineEvent";

export default defineEvent({
    name: Events.MessageCreate,
    execute(message) {
        if (message.content.includes('http://')) {
            // On supprime le message
            message.delete().then(r =>
            console.log('Message supprimé car contient un lien http'));
        }
        // On ignore les messages des bots
        if (message.author.bot) return;
    },
});