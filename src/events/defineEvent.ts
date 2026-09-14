import type { Client, ClientEvents } from 'discord.js';

// Un event : le nom de l'événement discord.js et la fonction à exécuter
export interface OtterbotsEvent<K extends keyof ClientEvents = keyof ClientEvents> {
	name: K;
	// true : ne s'exécute qu'une seule fois
	once?: boolean;
	execute(...args: ClientEvents[K]): void | Promise<void>;
}

// Ne fait rien à l'exécution : sert à typer les arguments de execute selon le nom de l'event
export function defineEvent<K extends keyof ClientEvents>(event: OtterbotsEvent<K>): OtterbotsEvent<K> {
	return event;
}

function registerEvent<K extends keyof ClientEvents>(client: Client, event: OtterbotsEvent<K>): void {
	// Une erreur dans un event est affichée sans faire planter le bot
	const listener = async (...args: ClientEvents[K]) => {
		try {
			await event.execute(...args);
		}
		catch (error) {
			console.error(`[events] Erreur dans l'event « ${event.name} » :`, error);
		}
	};

	if (event.once) {
		client.once(event.name, listener);
	}
	else {
		client.on(event.name, listener);
	}
}

export function registerEvents(client: Client, events: OtterbotsEvent[]): void {
	for (const event of events) {
		registerEvent(client, event);
	}
}
