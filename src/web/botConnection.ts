import type { BotStatus } from '../api/botApi';
import { HttpError } from '../api/http';
import {
	type OtterguardState,
	applyConfigChange,
	getOtterguardState,
	parseEnabled,
	parseOtterguardSettings,
} from '../api/otterguardPayload';
import type { Otterbots } from '../index';

// Un bot distant, piloté via son API
export interface RemoteBotOptions {
	// Nom affiché dans le panneau
	name: string;
	// Adresse de l'API du bot, par exemple http://10.0.0.5:4000
	url: string;
	// Même valeur que le token de l'API du bot
	token: string;
}

// Bot tel qu'affiché dans la liste du panneau
export interface BotSummary {
	id: string;
	name: string;
	local: boolean;
	// true : connecté à Discord
	online: boolean;
	tag: string | null;
	avatarUrl: string | null;
	guilds: number | null;
	// Raison pour laquelle le bot n'a pas pu être contacté
	error: string | null;
}

// Même interface pour le bot du process et pour un bot distant : le panneau ne fait pas la différence.
// Les corps de requête sont transmis tels quels, la validation est faite au plus près de la configuration
export interface BotConnection {
	readonly id: string;
	summary(): Promise<BotSummary>;
	getOtterguard(): Promise<OtterguardState>;
	updateOtterguard(body: unknown): Promise<OtterguardState>;
	setOtterguardEnabled(body: unknown): Promise<OtterguardState>;
}

// Délai maximal de réponse d'un bot distant
const REQUEST_TIMEOUT_MS = 5000;

// Le bot qui fait tourner le panneau : accès direct, sans passer par HTTP
export class LocalBotConnection implements BotConnection {
	readonly id = 'local';
	private readonly bot: Otterbots;

	constructor(bot: Otterbots) {
		this.bot = bot;
	}

	async summary(): Promise<BotSummary> {
		const { ready, tag, avatarUrl, guilds } = this.bot.status;
		return { id: this.id, name: tag ?? 'Ce bot', local: true, online: ready, tag, avatarUrl, guilds, error: null };
	}

	async getOtterguard(): Promise<OtterguardState> {
		return getOtterguardState(this.bot.config);
	}

	async updateOtterguard(body: unknown): Promise<OtterguardState> {
		const settings = parseOtterguardSettings(body);
		return applyConfigChange(this.bot.config, (config) => config.updateOtterguard(settings));
	}

	async setOtterguardEnabled(body: unknown): Promise<OtterguardState> {
		const enabled = parseEnabled(body);
		return applyConfigChange(this.bot.config, (config) => config.setOtterguardEnabled(enabled));
	}
}

export class RemoteBotConnection implements BotConnection {
	readonly id: string;
	private readonly options: RemoteBotOptions;

	constructor(id: string, options: RemoteBotOptions) {
		this.id = id;
		this.options = options;
	}

	async summary(): Promise<BotSummary> {
		const base = { id: this.id, name: this.options.name, local: false };

		try {
			const status = await this.request<BotStatus>('GET', '/api/bot');
			return {
				...base,
				online: status.ready,
				tag: status.tag,
				// Absent chez un bot d'une version plus ancienne
				avatarUrl: status.avatarUrl ?? null,
				guilds: status.guilds,
				error: null,
			};
		}
		catch (error) {
			return {
				...base,
				online: false,
				tag: null,
				avatarUrl: null,
				guilds: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	getOtterguard(): Promise<OtterguardState> {
		return this.request('GET', '/api/otterguard');
	}

	updateOtterguard(body: unknown): Promise<OtterguardState> {
		return this.request('PUT', '/api/otterguard', body);
	}

	setOtterguardEnabled(body: unknown): Promise<OtterguardState> {
		return this.request('PUT', '/api/otterguard/enabled', body);
	}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const { name, url, token } = this.options;
		const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
		if (body !== undefined) {
			headers['Content-Type'] = 'application/json';
		}

		let res: Response;
		try {
			// Concaténation plutôt que new URL(path, url) : conserve un éventuel préfixe de chemin (reverse proxy)
			res = await fetch(url.replace(/\/+$/, '') + path, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
		}
		catch {
			throw new HttpError(502, `« ${name} » est injoignable (${url})`);
		}

		const data = (await res.json().catch(() => ({}))) as { error?: unknown };

		if (res.status === 401) {
			throw new HttpError(502, `« ${name} » a refusé le token`);
		}
		if (!res.ok) {
			const message = typeof data.error === 'string' ? data.error : `« ${name} » a répondu ${res.status}`;
			// Les erreurs de validation (4xx) sont transmises telles quelles à la page
			throw new HttpError(res.status >= 500 ? 502 : res.status, message);
		}

		return data as T;
	}
}

// Le bot local (s'il y en a un) en premier, puis les bots distants dans l'ordre de la configuration
export function createBotConnections(bot: Otterbots | null, remoteBots: RemoteBotOptions[]): BotConnection[] {
	const remotes = remoteBots.map((options, index) => new RemoteBotConnection(`bot-${index + 1}`, options));
	return bot ? [new LocalBotConnection(bot), ...remotes] : remotes;
}
