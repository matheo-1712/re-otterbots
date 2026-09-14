import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { OtterbotsEvent } from './defineEvent';

// .ts avec tsx, .js une fois compilé ; les .d.ts et .js.map sont ignorés
function isEventFile(file: string): boolean {
	return (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts');
}

function isOtterbotsEvent(value: unknown): value is OtterbotsEvent {
	const event = value as Partial<OtterbotsEvent> | null;
	return typeof event?.name === 'string' && typeof event.execute === 'function';
}

// Charge chaque fichier du dossier et récupère l'event exporté par défaut
export function loadEventsFromDirectory(directory: string): OtterbotsEvent[] {
	const absoluteDirectory = resolve(directory);
	const files = readdirSync(absoluteDirectory).filter(isEventFile).sort();
	const events: OtterbotsEvent[] = [];

	for (const file of files) {
		const { default: event } = require(join(absoluteDirectory, file)) as { default?: unknown };

		if (!isOtterbotsEvent(event)) {
			console.warn(`[events] ${file} ignoré : il doit contenir « export default defineEvent({ … }) »`);
			continue;
		}

		events.push(event);
	}

	return events;
}
