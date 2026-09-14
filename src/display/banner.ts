import { type Client, version as discordJsVersion } from 'discord.js';

// Les couleurs ne sont activées que dans un vrai terminal, et si NO_COLOR n'est pas défini
const useColor = Boolean(process.stdout.isTTY) && !('NO_COLOR' in process.env);

function paint(code: string, text: string): string {
	return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const style = {
	bold: (text: string) => paint('1', text),
	dim: (text: string) => paint('2', text),
	accent: (text: string) => paint('38;5;80', text),
	success: (text: string) => paint('38;5;114', text),
	warning: (text: string) => paint('38;5;214', text),
};

// Lettres du titre « Re:Otterbots » (police figlet small), 4 lignes chacune
const LETTERS: string[][] = [
	[' ___ ', '| _ \\', '|   /', '|_|_\\'],
	['     ', ' ___ ', '/ -_)', '\\___|'],
	[' _ ', '(_)', ' _ ', '(_)'],
	['  ___  ', ' / _ \\ ', '| (_) |', ' \\___/ '],
	[' _   ', '| |_ ', '|  _|', ' \\__|'],
	[' _   ', '| |_ ', '|  _|', ' \\__|'],
	['     ', ' ___ ', '/ -_)', '\\___|'],
	['     ', ' _ _ ', '| \'_|', '|_|  '],
	[' _    ', '| |__ ', '| \'_ \\', '|_.__/'],
	['     ', ' ___ ', '/ _ \\', '\\___/'],
	[' _   ', '| |_ ', '|  _|', ' \\__|'],
	['    ', ' ___', '(_-<', '/__/'],
];

// Dégradé turquoise → bleu, une couleur par ligne du titre
const TITLE_GRADIENT = ['38;5;122', '38;5;86', '38;5;80', '38;5;74'];

function renderTitle(): string[] {
	return TITLE_GRADIENT.map((color, row) =>
		paint(`1;${color}`, LETTERS.map((letter) => letter[row]).join(' ')),
	);
}

// Les largeurs sont calculées sur le texte brut, avant l'ajout des couleurs
function renderInfoBox(rows: [string, string][]): string[] {
	const labelWidth = Math.max(...rows.map(([label]) => label.length));
	const contentWidth = Math.max(...rows.map(([, value]) => labelWidth + 3 + value.length));
	const border = '─'.repeat(contentWidth + 2);

	const lines = rows.map(([label, value]) => {
		const padding = ' '.repeat(contentWidth - labelWidth - 3 - value.length);
		return `${style.dim('│')} ${style.dim(label.padEnd(labelWidth))}   ${style.bold(value)}${padding} ${style.dim('│')}`;
	});

	return [style.dim(`╭${border}╮`), ...lines, style.dim(`╰${border}╯`)];
}

// Avertissements reçus avant la fin de la connexion, affichés sous l'écran d'accueil
const pendingWarnings: string[] = [];
let warningsReleased = false;

function writeWarning(message: string): void {
	console.warn(`  ${style.warning('▲')} ${style.dim('[discord.js]')} ${message}`);
}

export function printWarning(message: string): void {
	if (warningsReleased) {
		writeWarning(message);
	}
	else {
		pendingWarnings.push(message);
	}
}

// Affiche les avertissements en attente ; les suivants s'afficheront directement
export function releaseWarnings(): void {
	warningsReleased = true;
	for (const message of pendingWarnings.splice(0)) {
		writeWarning(message);
	}
}

export function printConnecting(): void {
	console.log(style.dim('Connexion à Discord…'));
}

export function printReadyBanner(client: Client<true>, startupMs: number): void {
	const { user } = client;
	const invite = `https://discord.com/oauth2/authorize?client_id=${user.id}&scope=bot+applications.commands`;

	const rows: [string, string][] = [
		['Bot', user.tag],
		['ID', user.id],
		['Serveurs', String(client.guilds.cache.size)],
		['Démarrage', `${startupMs} ms`],
		['discord.js', `v${discordJsVersion}`],
		['Node.js', process.version],
	];

	const output = [
		'',
		...renderTitle(),
		'',
		...renderInfoBox(rows),
		'',
		`${style.success('●')} ${style.bold('En ligne')} ${style.dim('— Ctrl+C pour arrêter')}`,
		`${style.dim('Inviter :')} ${style.accent(invite)}`,
		'',
	];

	console.log(output.map((line) => (line ? `  ${line}` : line)).join('\n'));
	releaseWarnings();
}
