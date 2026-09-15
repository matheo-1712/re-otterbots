import { EventEmitter } from 'node:events';
import { type FSWatcher, existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { type Document, isMap, parseDocument } from 'yaml';

// Motif tel qu'écrit dans le YAML : un texte simple, ou un objet avec text ou regex
export type BlockedPatternInput = string | { text: string; reason?: string } | { regex: string; reason?: string };

export interface BlockedPattern {
	// Format d'origine : texte recherché tel quel, ou expression régulière
	type: 'text' | 'regex';
	// Expression compilée, insensible à la casse
	regex: RegExp;
	// Motif d'origine, pour l'afficher dans les logs
	source: string;
	reason?: string;
}

export interface AntiSpamConfig {
	// true : un même auteur (bots compris) qui écrit dans plusieurs salons en peu de temps est traité comme spammeur
	enabled: boolean;
	// Nombre de salons différents qui déclenche l'anti-spam…
	channels: number;
	// … en moins de ce nombre de secondes
	seconds: number;
	// Exclusion temporaire du spammeur, en minutes. 0 : aucune
	timeoutMinutes: number;
}

// Désactivé par défaut : la librairie n'agit pas sans configuration
const DEFAULT_ANTI_SPAM: AntiSpamConfig = { enabled: false, channels: 3, seconds: 10, timeoutMinutes: 10 };

// Réglages d'OtterGuard modifiables en une seule fois (interface web)
export interface OtterguardSettings {
	enabled: boolean;
	blockedPatterns: BlockedPatternInput[];
	exemptRoles: string[];
	// ID du salon de logs « otterguard », ou null pour le retirer
	logChannel: string | null;
	// Signaler aussi chaque suppression en console. Absent : réglage inchangé (bots et panneaux de versions différentes)
	consoleLog?: boolean;
	// Absent : réglages de l'anti-spam inchangés
	antiSpam?: AntiSpamConfig;
}

export interface OtterbotsConfig {
	logs: {
		// Nom du salon de logs (otterguard, moderation…) → ID du salon Discord
		channels: Record<string, string>;
	};
	otterguard: {
		// false : OtterGuard ne vérifie aucun message
		enabled: boolean;
		// true : chaque suppression est aussi signalée dans la console du bot, sans le contenu du message
		consoleLog: boolean;
		antiSpam: AntiSpamConfig;
		// Messages supprimés s'ils correspondent à l'un de ces motifs
		blockedPatterns: BlockedPattern[];
		// IDs des rôles dont les messages ne sont jamais vérifiés
		exemptRoles: string[];
	};
}

// Comment le bot choisit d'utiliser son fichier de configuration
export interface ConfigFileOptions {
	// Si le fichier n'existe pas :
	//   'error'  (défaut) : lève une erreur
	//   'create' : crée le fichier (et ses dossiers) avec la configuration actuelle
	//   'ignore' : ne fait rien, la configuration reste en mémoire
	ifMissing?: 'error' | 'create' | 'ignore';
	// false : le fichier n'est pas surveillé, les modifications manuelles ne sont pas rechargées (true par défaut)
	watch?: boolean;
}

// Configuration de départ, en mémoire : aucun salon, aucun motif. Écrite telle quelle avec ifMissing: 'create'
const EMPTY_CONFIG = `# Configuration de Re:Otterbots, rechargée à chaud et modifiable depuis l'interface web

logs:
  # Salons de logs : nom → ID du salon Discord (entre guillemets)
  channels: {}

otterguard:
  # false : OtterGuard ne vérifie aucun message
  enabled: true
  # true : chaque suppression est aussi signalée dans la console du bot (sans le contenu du message)
  consoleLog: true
  # Anti-spam : même auteur (bots compris) dans plusieurs salons en peu de temps
  antiSpam:
    enabled: false
    # Nombre de salons différents…
    channels: 3
    # … en moins de ce nombre de secondes
    seconds: 10
    # Exclusion temporaire en minutes (0 : aucune)
    timeoutMinutes: 10
  # Messages supprimés s'ils contiennent l'un de ces motifs (text ou regex, reason optionnel)
  blockedPatterns: []
  # IDs des rôles dont les messages ne sont jamais vérifiés
  exemptRoles: []
`;

// Un ID Discord (snowflake) : 17 à 20 chiffres
const SNOWFLAKE = /^\d{17,20}$/;

// Limites pour qu'un motif ne puisse pas bloquer le bot
const MAX_PATTERNS = 100;
const MAX_PATTERN_LENGTH = 200;

// Délai d'attente après une modification du fichier, les éditeurs l'écrivant souvent en plusieurs fois
const RELOAD_DELAY_MS = 100;

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Les IDs sans guillemets sont lus en bigint pour ne pas perdre de précision
function parseSnowflake(value: unknown, where: string): string {
	const id = typeof value === 'bigint' ? value.toString() : value;

	if (typeof id !== 'string' || !SNOWFLAKE.test(id)) {
		throw new Error(`${where} : « ${String(value)} » n'est pas un ID Discord valide`);
	}

	return id;
}

// *, + ou {n,} / {n,m} à cette position
function isRepeatQuantifier(pattern: string, index: number): boolean {
	const char = pattern[index];
	return char === '*' || char === '+' || (char === '{' && /^\{\d+(,\d*)?\}/.test(pattern.slice(index)));
}

// Détecte les constructions qui rendent une regex exponentiellement lente sur certains messages
// (backtracking catastrophique). Renvoie la raison du refus, ou null si le motif est accepté
function findUnsafeRegexReason(pattern: string): string | null {
	// Pour chaque groupe ouvert : true s'il contient une répétition
	const groups: boolean[] = [];
	let inCharacterClass = false;

	for (let index = 0; index < pattern.length; index++) {
		const char = pattern[index];

		if (char === '\\') {
			const next = pattern[index + 1] ?? '';
			if (!inCharacterClass && /[1-9k]/.test(next)) {
				return 'les références arrière (\\1, \\k<nom>) ne sont pas autorisées';
			}
			index++;
			continue;
		}

		if (inCharacterClass) {
			inCharacterClass = char !== ']';
			continue;
		}

		if (char === '[') {
			inCharacterClass = true;
		}
		else if (char === '(') {
			groups.push(false);
		}
		else if (char === ')') {
			const containsRepeat = groups.pop() ?? false;

			if (containsRepeat && isRepeatQuantifier(pattern, index + 1)) {
				return 'les répétitions imbriquées, comme (a+)+ ou (\\w*)*, ne sont pas autorisées';
			}
			if (containsRepeat && groups.length > 0) {
				groups[groups.length - 1] = true;
			}
		}
		else if (groups.length > 0 && isRepeatQuantifier(pattern, index)) {
			groups[groups.length - 1] = true;
		}
	}

	return null;
}

function parseBlockedPattern(value: unknown, index: number): BlockedPattern {
	const where = `otterguard.blockedPatterns[${index}]`;
	const input = (typeof value === 'string' ? { text: value } : value) as
		{ text?: unknown; regex?: unknown; reason?: unknown } | null;
	const reason = typeof input?.reason === 'string' ? input.reason : undefined;
	const source = input?.text ?? input?.regex;

	if (typeof source !== 'string' || !source || (input?.text !== undefined && input.regex !== undefined)) {
		throw new Error(`${where} : chaque motif doit avoir soit « text », soit « regex »`);
	}

	if (source.length > MAX_PATTERN_LENGTH) {
		throw new Error(`${where} : un motif ne peut pas dépasser ${MAX_PATTERN_LENGTH} caractères`);
	}

	if (input?.text !== undefined) {
		return { type: 'text', regex: new RegExp(escapeRegExp(source), 'i'), source, reason };
	}

	const unsafeReason = findUnsafeRegexReason(source);
	if (unsafeReason) {
		throw new Error(`${where} : « ${source} » refusé, ${unsafeReason}`);
	}

	try {
		return { type: 'regex', regex: new RegExp(source, 'i'), source, reason };
	}
	catch {
		throw new Error(`${where} : « ${source} » n'est pas une expression régulière valide`);
	}
}

// Les entiers du YAML sont lus en bigint (intAsBigInt)
function parseInteger(value: unknown, where: string, min: number, max: number): number {
	const number = typeof value === 'bigint' ? Number(value) : value;

	if (typeof number !== 'number' || !Number.isInteger(number) || number < min || number > max) {
		throw new Error(`${where} doit être un nombre entier entre ${min} et ${max}`);
	}

	return number;
}

function parseAntiSpam(value: unknown): AntiSpamConfig {
	if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
		throw new Error('otterguard.antiSpam doit contenir enabled, channels, seconds et timeoutMinutes');
	}

	const input = (value ?? {}) as Record<string, unknown>;
	const enabled = input.enabled ?? DEFAULT_ANTI_SPAM.enabled;
	if (typeof enabled !== 'boolean') {
		throw new Error('otterguard.antiSpam.enabled doit valoir true ou false');
	}

	return {
		enabled,
		channels: parseInteger(input.channels ?? DEFAULT_ANTI_SPAM.channels, 'otterguard.antiSpam.channels', 2, 50),
		seconds: parseInteger(input.seconds ?? DEFAULT_ANTI_SPAM.seconds, 'otterguard.antiSpam.seconds', 1, 300),
		// 40 320 minutes = 28 jours, maximum autorisé par Discord
		timeoutMinutes: parseInteger(
			input.timeoutMinutes ?? DEFAULT_ANTI_SPAM.timeoutMinutes,
			'otterguard.antiSpam.timeoutMinutes',
			0,
			40_320,
		),
	};
}

function parseList(value: unknown, where: string): unknown[] {
	if (!Array.isArray(value)) {
		throw new Error(`${where} doit être une liste`);
	}
	return value;
}

function setLogChannelIn(document: Document, name: string, channelId: string): void {
	document.setIn(['logs', 'channels', name], parseSnowflake(channelId, `logs.channels.${name}`));

	// Passe « channels: {} » en liste indentée classique
	const channels = document.getIn(['logs', 'channels'], true);
	if (isMap(channels)) {
		channels.flow = false;
	}
}

function parseConfig(document: Document): OtterbotsConfig {
	const [firstError] = document.errors;
	if (firstError) {
		throw new Error(`YAML invalide : ${firstError.message}`);
	}

	const data = (document.toJS() ?? {}) as {
		logs?: { channels?: Record<string, unknown> };
		otterguard?: {
			enabled?: unknown;
			consoleLog?: unknown;
			antiSpam?: unknown;
			blockedPatterns?: unknown;
			exemptRoles?: unknown;
		};
	};

	const channels: Record<string, string> = {};
	for (const [name, value] of Object.entries(data.logs?.channels ?? {})) {
		channels[name] = parseSnowflake(value, `logs.channels.${name}`);
	}

	// Activé par défaut : sans motif configuré, OtterGuard ne fait rien de toute façon
	const enabled = data.otterguard?.enabled ?? true;
	if (typeof enabled !== 'boolean') {
		throw new Error('otterguard.enabled doit valoir true ou false');
	}

	const consoleLog = data.otterguard?.consoleLog ?? true;
	if (typeof consoleLog !== 'boolean') {
		throw new Error('otterguard.consoleLog doit valoir true ou false');
	}

	const antiSpam = parseAntiSpam(data.otterguard?.antiSpam);

	const rawPatterns = parseList(data.otterguard?.blockedPatterns ?? [], 'otterguard.blockedPatterns');
	if (rawPatterns.length > MAX_PATTERNS) {
		throw new Error(`otterguard.blockedPatterns : ${MAX_PATTERNS} motifs maximum`);
	}

	const exemptRoles = parseList(data.otterguard?.exemptRoles ?? [], 'otterguard.exemptRoles')
		.map((value, index) => parseSnowflake(value, `otterguard.exemptRoles[${index}]`));

	return {
		logs: { channels },
		otterguard: { enabled, consoleLog, antiSpam, blockedPatterns: rawPatterns.map(parseBlockedPattern), exemptRoles },
	};
}

export class ConfigStore extends EventEmitter<{ change: [config: OtterbotsConfig] }> {
	private document = parseDocument(EMPTY_CONFIG);
	private config = parseConfig(this.document);

	// Dernier contenu appliqué, pour ignorer les rechargements sans changement
	private lastContent = EMPTY_CONFIG;

	private filePath: string | null = null;
	private watcher: FSWatcher | null = null;
	private reloadTimer: NodeJS.Timeout | null = null;

	get current(): Readonly<OtterbotsConfig> {
		return this.config;
	}

	getLogChannel(name: string): string | undefined {
		return this.config.logs.channels[name];
	}

	// false : aucun fichier chargé, les modifications restent en mémoire
	get persistent(): boolean {
		return this.filePath !== null;
	}

	// Utilise ce fichier YAML (chemin libre, relatif au dossier courant) : le charge, y enregistre
	// les modifications et, par défaut, le surveille pour appliquer les modifications à chaud
	load(filePath: string, options: ConfigFileOptions = {}): void {
		const { ifMissing = 'error', watch: shouldWatch = true } = options;
		const absolutePath = resolve(filePath);

		if (!existsSync(absolutePath)) {
			if (ifMissing === 'ignore') {
				return;
			}
			if (ifMissing === 'error') {
				throw new Error(`Fichier de configuration introuvable : ${absolutePath}`);
			}

			mkdirSync(dirname(absolutePath), { recursive: true });
			writeFileSync(absolutePath, this.lastContent);
			console.log(`[config] Fichier de configuration créé : ${absolutePath}`);
		}

		this.apply(readFileSync(absolutePath, 'utf8'));
		this.filePath = absolutePath;

		if (shouldWatch) {
			this.watchFile(absolutePath);
		}
		else {
			// Arrête la surveillance d'un fichier chargé précédemment
			this.close();
		}
	}

	// Associe un nom de logs à un salon et enregistre le fichier (utilisable depuis une interface web)
	setLogChannel(name: string, channelId: string): void {
		const document = this.document.clone();
		setLogChannelIn(document, name, channelId);
		this.save(document);
	}

	removeLogChannel(name: string): void {
		const document = this.document.clone();
		document.deleteIn(['logs', 'channels', name]);
		this.save(document);
	}

	// Remplace la liste des motifs bloqués ; lève une erreur (sans rien modifier) si un motif est refusé
	setBlockedPatterns(patterns: BlockedPatternInput[]): void {
		const document = this.document.clone();
		document.setIn(['otterguard', 'blockedPatterns'], document.createNode(patterns));
		this.save(document);
	}

	// Remplace la liste des rôles exemptés ; lève une erreur (sans rien modifier) si un ID est invalide
	setExemptRoles(roleIds: string[]): void {
		const document = this.document.clone();
		document.setIn(['otterguard', 'exemptRoles'], document.createNode(roleIds));
		this.save(document);
	}

	// Active ou désactive OtterGuard
	setOtterguardEnabled(enabled: boolean): void {
		const document = this.document.clone();
		document.setIn(['otterguard', 'enabled'], enabled);
		this.save(document);
	}

	// Remplace tous les réglages d'OtterGuard en une seule écriture : si un élément est refusé, rien n'est modifié
	updateOtterguard(settings: OtterguardSettings): void {
		const document = this.document.clone();
		document.setIn(['otterguard', 'enabled'], settings.enabled);
		if (settings.consoleLog !== undefined) {
			document.setIn(['otterguard', 'consoleLog'], settings.consoleLog);
		}
		if (settings.antiSpam) {
			// Clé par clé, pour conserver les commentaires de la section
			for (const [key, value] of Object.entries(settings.antiSpam)) {
				document.setIn(['otterguard', 'antiSpam', key], value);
			}
		}
		document.setIn(['otterguard', 'blockedPatterns'], document.createNode(settings.blockedPatterns));
		document.setIn(['otterguard', 'exemptRoles'], document.createNode(settings.exemptRoles));

		if (settings.logChannel) {
			setLogChannelIn(document, 'otterguard', settings.logChannel);
		}
		else {
			document.deleteIn(['logs', 'channels', 'otterguard']);
		}

		this.save(document);
	}

	// Arrête la surveillance du fichier
	close(): void {
		this.watcher?.close();
		this.watcher = null;

		if (this.reloadTimer) {
			clearTimeout(this.reloadTimer);
		}
	}

	private apply(content: string): void {
		const document = parseDocument(content, { intAsBigInt: true });
		const config = parseConfig(document);

		this.document = document;
		this.config = config;
		this.lastContent = content;
	}

	// Écrit via le document YAML pour conserver les commentaires du fichier.
	// apply() valide d'abord : une configuration invalide n'est jamais écrite
	private save(document: Document): void {
		const content = document.toString();
		this.apply(content);

		if (this.filePath) {
			writeFileSync(this.filePath, content);
		}

		this.emit('change', this.config);
	}

	// Surveille le dossier plutôt que le fichier : beaucoup d'éditeurs remplacent le fichier en l'enregistrant
	private watchFile(filePath: string): void {
		this.close();

		const fileName = basename(filePath);
		this.watcher = watch(dirname(filePath), (_event, changedFile) => {
			if (changedFile === fileName) {
				this.scheduleReload(filePath);
			}
		});

		// La surveillance seule ne doit pas empêcher le process de s'arrêter
		this.watcher.unref();
	}

	private scheduleReload(filePath: string): void {
		if (this.reloadTimer) {
			clearTimeout(this.reloadTimer);
		}

		this.reloadTimer = setTimeout(() => this.reload(filePath), RELOAD_DELAY_MS);
	}

	private reload(filePath: string): void {
		try {
			const content = readFileSync(filePath, 'utf8');
			if (content === this.lastContent) {
				return;
			}

			this.apply(content);
			console.log('[config] Configuration rechargée');
			this.emit('change', this.config);
		}
		catch (error) {
			const reason = error instanceof Error ? error.message : error;
			console.error('[config] Modification ignorée, la configuration précédente est conservée :', reason);
		}
	}
}
