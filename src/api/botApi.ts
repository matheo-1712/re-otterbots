import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Otterbots } from '../index';
import { DEFAULT_HOST, HttpError, closeServer, createJsonServer, listen, readJson, safeEqual, sendJson, serverUrl } from './http';
import { applyConfigChange, getOtterguardState, parseEnabled, parseOtterguardSettings } from './otterguardPayload';

export interface BotApiOptions {
	// Secret partagé avec le panneau, envoyé dans l'en-tête Authorization: Bearer
	token: string;
	// Port d'écoute, 4000 par défaut
	port?: number;
	// Adresse d'écoute, 127.0.0.1 par défaut. 0.0.0.0 pour être joignable depuis d'autres services
	host?: string;
}

// État de la connexion à Discord
export interface BotStatus {
	ready: boolean;
	tag: string | null;
	id: string | null;
	// Photo de profil du bot (ou avatar par défaut de Discord), null tant qu'il n'est pas connecté
	avatarUrl: string | null;
	guilds: number;
}

const DEFAULT_PORT = 4000;

// Un token court se devine trop facilement
const MIN_TOKEN_LENGTH = 16;

// API JSON d'un bot : permet à un panneau lancé sur un autre service de lire et modifier sa configuration
export class BotApi {
	private readonly bot: Otterbots;
	private readonly options: BotApiOptions;
	private server: Server | null = null;

	constructor(bot: Otterbots, options: BotApiOptions) {
		if (options.token.length < MIN_TOKEN_LENGTH) {
			throw new Error(`Le token de l'API doit faire au moins ${MIN_TOKEN_LENGTH} caractères`);
		}

		this.bot = bot;
		this.options = options;
	}

	// Adresse de l'API, null tant qu'elle n'est pas lancée
	get url(): string | null {
		return serverUrl(this.server);
	}

	async start(): Promise<void> {
		const server = createJsonServer('api', (req, res) => this.handle(req, res));
		await listen(server, this.options.port ?? DEFAULT_PORT, this.options.host ?? DEFAULT_HOST);
		this.server = server;
	}

	async stop(): Promise<void> {
		const server = this.server;
		this.server = null;

		if (server) {
			await closeServer(server);
		}
	}

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (!this.isAuthorized(req)) {
			throw new HttpError(401, 'Token invalide');
		}

		const { pathname } = new URL(req.url ?? '/', 'http://localhost');
		const { config } = this.bot;

		if (pathname === '/api/bot' && req.method === 'GET') {
			sendJson(res, 200, this.bot.status);
		}
		else if (pathname === '/api/otterguard' && req.method === 'GET') {
			sendJson(res, 200, getOtterguardState(config));
		}
		else if (pathname === '/api/otterguard' && req.method === 'PUT') {
			const settings = parseOtterguardSettings(await readJson(req));
			sendJson(res, 200, applyConfigChange(config, (store) => store.updateOtterguard(settings)));
		}
		else if (pathname === '/api/otterguard/enabled' && req.method === 'PUT') {
			const enabled = parseEnabled(await readJson(req));
			sendJson(res, 200, applyConfigChange(config, (store) => store.setOtterguardEnabled(enabled)));
		}
		else {
			throw new HttpError(404, 'Route introuvable');
		}
	}

	private isAuthorized(req: IncomingMessage): boolean {
		const header = req.headers.authorization ?? '';
		return header.startsWith('Bearer ') && safeEqual(header.slice('Bearer '.length), this.options.token);
	}
}
