import { timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';

// Par défaut, les serveurs n'écoutent que sur la machine locale
export const DEFAULT_HOST = '127.0.0.1';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

// Taille maximale d'une requête (100 motifs de 200 caractères tiennent largement)
const MAX_BODY_BYTES = 100_000;

// Erreur dont le message est renvoyé tel quel au client
export class HttpError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function isLoopbackHost(host: string): boolean {
	return LOOPBACK_HOSTS.has(host);
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
	res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
	res.end(JSON.stringify(data));
}

// Exiger du JSON empêche un autre site d'envoyer la requête via un simple formulaire
export async function readJson(req: IncomingMessage): Promise<unknown> {
	if (!req.headers['content-type']?.startsWith('application/json')) {
		throw new HttpError(415, 'Le corps de la requête doit être du JSON');
	}

	const chunks: Buffer[] = [];
	let size = 0;

	for await (const chunk of req) {
		size += (chunk as Buffer).length;
		if (size > MAX_BODY_BYTES) {
			throw new HttpError(413, 'Requête trop volumineuse');
		}
		chunks.push(chunk as Buffer);
	}

	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	}
	catch {
		throw new HttpError(400, 'JSON invalide');
	}
}

// Comparaison en temps constant, pour ne pas révéler un secret caractère par caractère
export function safeEqual(given: string, expected: string): boolean {
	const givenBuffer = Buffer.from(given);
	const expectedBuffer = Buffer.from(expected);
	return givenBuffer.length === expectedBuffer.length && timingSafeEqual(givenBuffer, expectedBuffer);
}

// Serveur dont les erreurs du handler sont renvoyées en JSON
export function createJsonServer(name: string, handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>): Server {
	return createServer((req, res) => {
		handler(req, res).catch((error: unknown) => {
			if (res.headersSent) {
				res.end();
				return;
			}

			if (error instanceof HttpError) {
				sendJson(res, error.status, { error: error.message });
				return;
			}

			console.error(`[${name}] Erreur :`, error);
			sendJson(res, 500, { error: 'Erreur interne' });
		});
	});
}

export function listen(server: Server, port: number, host: string): Promise<void> {
	return new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, host, () => {
			server.off('error', reject);
			resolve();
		});
	});
}

export function closeServer(server: Server): Promise<void> {
	const closed = new Promise<void>((resolve) => server.close(() => resolve()));
	// Ferme aussi les connexions keep-alive, sinon close attend qu'elles expirent
	server.closeAllConnections();
	return closed;
}

// Adresse du serveur, null s'il n'écoute pas
export function serverUrl(server: Server | null): string | null {
	const address = server?.address();
	if (!address || typeof address === 'string') {
		return null;
	}

	const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
	return `http://${host}:${address.port}`;
}
