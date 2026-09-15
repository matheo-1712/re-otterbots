import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { RemoteBotOptions } from './botConnection';

// Lit la liste des bots distants à piloter depuis le panneau, dans un fichier YAML choisi par le bot
export function loadPanelBots(filePath: string): RemoteBotOptions[] {
	const data = parse(readFileSync(filePath, 'utf8')) as { bots?: unknown } | null;
	const bots = data?.bots ?? [];

	if (!Array.isArray(bots)) {
		throw new Error(`${filePath} : « bots » doit être une liste`);
	}

	return bots.map((value: unknown, index) => {
		const { name, url, token } = (value ?? {}) as Record<string, unknown>;
		const where = `${filePath} : bots[${index}]`;

		if (typeof name !== 'string' || !name) {
			throw new Error(`${where} : « name » est obligatoire`);
		}
		if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
			throw new Error(`${where} : « url » doit commencer par http:// ou https://`);
		}
		if (typeof token !== 'string' || !token) {
			throw new Error(`${where} : « token » est obligatoire`);
		}

		return { name, url, token };
	});
}
