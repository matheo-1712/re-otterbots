import type { AntiSpamConfig, BlockedPatternInput, ConfigStore, OtterguardSettings } from '../config/configStore';
import { HttpError } from './http';

// Réglages d'OtterGuard tels qu'échangés en JSON entre la page, le panneau et l'API des bots
export interface OtterguardState {
	enabled: boolean;
	consoleLog: boolean;
	antiSpam: AntiSpamConfig;
	blockedPatterns: { type: 'text' | 'regex'; value: string; reason: string }[];
	exemptRoles: string[];
	logChannel: string | null;
	// false : aucun fichier chargé, les modifications seront perdues au redémarrage du bot
	persistent: boolean;
}

export function getOtterguardState(config: ConfigStore): OtterguardState {
	const { enabled, consoleLog, antiSpam, blockedPatterns, exemptRoles } = config.current.otterguard;

	return {
		enabled,
		consoleLog,
		antiSpam,
		blockedPatterns: blockedPatterns.map(({ type, source, reason }) => ({ type, value: source, reason: reason ?? '' })),
		exemptRoles,
		logChannel: config.getLogChannel('otterguard') ?? null,
		persistent: config.persistent,
	};
}

// Vérifie seulement la forme : le contenu (regex, IDs…) est validé par la configuration
function parsePattern(value: unknown, index: number): BlockedPatternInput {
	const { type, value: pattern, reason } = (value ?? {}) as Record<string, unknown>;

	if ((type !== 'text' && type !== 'regex') || typeof pattern !== 'string') {
		throw new HttpError(400, `Motif n°${index + 1} : format invalide`);
	}

	// Une raison vide n'est pas écrite dans le fichier
	const cleanReason = typeof reason === 'string' && reason.trim() ? reason.trim() : undefined;

	return type === 'text' ? { text: pattern, reason: cleanReason } : { regex: pattern, reason: cleanReason };
}

// Facultatif : un panneau plus ancien ne l'envoie pas. Les bornes sont vérifiées par la configuration
function parseAntiSpam(value: unknown): AntiSpamConfig | undefined {
	if (value === undefined) {
		return undefined;
	}

	const { enabled, channels, seconds, timeoutMinutes } = (value ?? {}) as Record<string, unknown>;
	if (
		typeof enabled !== 'boolean'
		|| typeof channels !== 'number'
		|| typeof seconds !== 'number'
		|| typeof timeoutMinutes !== 'number'
	) {
		throw new HttpError(400, '« antiSpam » doit contenir enabled, channels, seconds et timeoutMinutes');
	}

	return { enabled, channels, seconds, timeoutMinutes };
}

export function parseOtterguardSettings(body: unknown): OtterguardSettings {
	const { enabled, consoleLog, antiSpam, blockedPatterns, exemptRoles, logChannel } = (body ?? {}) as Record<string, unknown>;

	if (typeof enabled !== 'boolean') {
		throw new HttpError(400, '« enabled » doit valoir true ou false');
	}
	// Facultatif : un panneau plus ancien ne l'envoie pas
	if (consoleLog !== undefined && typeof consoleLog !== 'boolean') {
		throw new HttpError(400, '« consoleLog » doit valoir true ou false');
	}
	if (!Array.isArray(blockedPatterns)) {
		throw new HttpError(400, '« blockedPatterns » doit être une liste');
	}
	if (!Array.isArray(exemptRoles) || !exemptRoles.every((id): id is string => typeof id === 'string')) {
		throw new HttpError(400, '« exemptRoles » doit être une liste d\'IDs');
	}
	if (logChannel !== null && typeof logChannel !== 'string') {
		throw new HttpError(400, '« logChannel » doit être un ID ou null');
	}

	return {
		enabled,
		consoleLog,
		antiSpam: parseAntiSpam(antiSpam),
		blockedPatterns: blockedPatterns.map(parsePattern),
		exemptRoles,
		logChannel: logChannel?.trim() || null,
	};
}

export function parseEnabled(body: unknown): boolean {
	const { enabled } = (body ?? {}) as Record<string, unknown>;
	if (typeof enabled !== 'boolean') {
		throw new HttpError(400, '« enabled » doit valoir true ou false');
	}
	return enabled;
}

// Applique une modification ; si la configuration la refuse, son message d'erreur est renvoyé (400)
export function applyConfigChange(config: ConfigStore, change: (config: ConfigStore) => void): OtterguardState {
	try {
		change(config);
	}
	catch (error) {
		throw new HttpError(400, error instanceof Error ? error.message : String(error));
	}

	return getOtterguardState(config);
}
