import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import {
	DEFAULT_HOST,
	HttpError,
	closeServer,
	createJsonServer,
	isLoopbackHost,
	listen,
	readJson,
	safeEqual,
	sendJson,
	serverUrl,
} from '../api/http';
import type { BotConnection, RemoteBotOptions } from './botConnection';
import { PANEL_PAGE } from './panelPage';

export interface WebPanelServerOptions {
	// Port d'écoute, 3000 par défaut
	port?: number;
	// Adresse d'écoute, 127.0.0.1 par défaut : le panneau n'est accessible que depuis cette machine
	host?: string;
	// Mot de passe demandé par le navigateur (authentification HTTP Basic). Obligatoire hors de la machine locale
	password?: string;
}

export interface WebPanelOptions extends WebPanelServerOptions {
	// Bots distants à piloter en plus du bot local
	bots?: RemoteBotOptions[];
}

const DEFAULT_PORT = 3000;

// /api/bots/:id/otterguard et /api/bots/:id/otterguard/enabled
const BOT_ROUTE = /^\/api\/bots\/([\w-]+)\/otterguard(\/enabled)?$/;

// Interface web : une page et une API JSON qui relaie chaque requête au bot choisi
export class WebPanel {
	private readonly connections: BotConnection[];
	private readonly options: WebPanelServerOptions;
	private server: Server | null = null;

	constructor(connections: BotConnection[], options: WebPanelServerOptions = {}) {
		this.connections = connections;
		this.options = options;
	}

	// Adresse du panneau, null tant qu'il n'est pas lancé
	get url(): string | null {
		return serverUrl(this.server);
	}

	async start(): Promise<void> {
		const host = this.options.host ?? DEFAULT_HOST;

		// Sans mot de passe, n'importe qui sur le réseau pourrait modifier la configuration des bots
		if (!isLoopbackHost(host) && !this.options.password) {
			throw new Error(`L'interface web écoute sur ${host} : un mot de passe est obligatoire`);
		}

		const server = createJsonServer('web', (req, res) => this.handle(req, res));
		await listen(server, this.options.port ?? DEFAULT_PORT, host);
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
		this.checkOrigin(req);

		if (!this.isAuthorized(req)) {
			res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Re:Otterbots", charset="UTF-8"' });
			res.end();
			return;
		}

		const { pathname } = new URL(req.url ?? '/', 'http://localhost');

		if (pathname === '/' && req.method === 'GET') {
			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-store',
				// La page ne peut pas être intégrée dans un autre site (clickjacking)
				'Content-Security-Policy': 'frame-ancestors \'none\'',
			});
			res.end(PANEL_PAGE);
			return;
		}

		if (pathname === '/api/bots' && req.method === 'GET') {
			sendJson(res, 200, await Promise.all(this.connections.map((connection) => connection.summary())));
			return;
		}

		const match = BOT_ROUTE.exec(pathname);
		if (!match) {
			throw new HttpError(404, 'Page introuvable');
		}

		const connection = this.connections.find(({ id }) => id === match[1]);
		if (!connection) {
			throw new HttpError(404, 'Bot introuvable');
		}

		const isEnabledRoute = match[2] !== undefined;

		if (isEnabledRoute && req.method === 'PUT') {
			sendJson(res, 200, await connection.setOtterguardEnabled(await readJson(req)));
		}
		else if (!isEnabledRoute && req.method === 'GET') {
			sendJson(res, 200, await connection.getOtterguard());
		}
		else if (!isEnabledRoute && req.method === 'PUT') {
			sendJson(res, 200, await connection.updateOtterguard(await readJson(req)));
		}
		else {
			throw new HttpError(405, 'Méthode non autorisée');
		}
	}

	// Refuse les requêtes d'un autre nom de domaine (DNS rebinding) ou envoyées depuis un autre site (CSRF)
	private checkOrigin(req: IncomingMessage): void {
		const hostHeader = req.headers.host ?? '';

		if (isLoopbackHost(this.options.host ?? DEFAULT_HOST)) {
			let hostname = '';
			try {
				hostname = new URL(`http://${hostHeader}`).hostname;
			}
			catch {
				// En-tête Host invalide : refusé ci-dessous
			}

			if (!isLoopbackHost(hostname)) {
				throw new HttpError(403, 'Hôte non autorisé');
			}
		}

		const { origin } = req.headers;
		if (req.method !== 'GET' && origin !== undefined && origin !== `http://${hostHeader}`) {
			throw new HttpError(403, 'Origine non autorisée');
		}
	}

	// Authentification HTTP Basic : le nom d'utilisateur est ignoré, seul le mot de passe compte
	private isAuthorized(req: IncomingMessage): boolean {
		const { password } = this.options;
		if (!password) {
			return true;
		}

		const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
		if (scheme !== 'Basic' || !encoded) {
			return false;
		}

		const credentials = Buffer.from(encoded, 'base64').toString('utf8');
		return safeEqual(credentials.slice(credentials.indexOf(':') + 1), password);
	}
}
