// Taille maximale d'un message recopié dans un log Discord (limite d'une description : 4096 caractères)
const MAX_LOGGED_CONTENT = 1000;

export function truncateForLog(content: string): string {
	return content.length > MAX_LOGGED_CONTENT ? `${content.slice(0, MAX_LOGGED_CONTENT)}…` : content;
}
