# Démarrage

## Prérequis

- **Node.js 20.12 ou plus récent** : le bot utilise `process.loadEnvFile()` pour lire le `.env`, sans dépendance supplémentaire.
- Un bot créé sur le [Discord Developer Portal](https://discord.com/developers/applications), avec son token.

## Installation

```bash
npm install
```

Copie ensuite `.env.example` vers `.env` et renseigne le token :

```env
BOT_TOKEN=ton_token_ici
```

Le fichier `.env` est ignoré par git : le token ne doit jamais être commité.

## Scripts npm

| Script | Rôle |
|---|---|
| `npm run dev` | Lance le bot avec `tsx` et le relance à chaque modification d'un fichier |
| `npm run build` | Compile le TypeScript dans `dist/` |
| `npm start` | Lance la version compilée (`dist/main.js`), à utiliser en production |
| `npm run typecheck` | Vérifie les types sans rien générer |

La configuration TypeScript ([tsconfig.json](../tsconfig.json)) est en mode `strict` et ne compile que le dossier `src/`.

## La classe `Otterbots`

Définie dans [src/index.ts](../src/index.ts).

```ts
const bot = new Otterbots(token);
```

| Méthode | Rôle |
|---|---|
| `constructor(token, intents?)` | Crée le client Discord avec les intents donnés (`[GatewayIntentBits.Guilds]` par défaut) et enregistre les [events intégrés](events.md#events-intégrés). Lève une erreur si le token est vide. |
| `addEvents(...events)` | Ajoute des events personnalisés. À appeler **avant** `start()`. Renvoie le bot, donc les appels peuvent s'enchaîner. |
| `start()` | Affiche « Connexion à Discord… » puis connecte le bot. Renvoie une promesse qui échoue si la connexion est refusée (token invalide, réseau…). |
| `stop()` | Déconnecte proprement le bot de Discord. |

### Intents

Par défaut, le client est créé avec le seul intent `Guilds`, suffisant pour se connecter et connaître la liste des serveurs. Pour en demander d'autres, passe-les en second argument :

```ts
const bot = new Otterbots(token, [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]);
```

Un event qui lit les messages demandera en plus `GuildMessages` et `MessageContent`. `MessageContent` est un intent **privilégié** : il faut aussi l'activer sur le Developer Portal.

## Le lanceur `src/main.ts`

[src/main.ts](../src/main.ts) est le fichier exécuté par `npm run dev` et `npm start`. Dans l'ordre, il :

1. **Charge le `.env`** s'il existe. Sinon, il utilise les variables d'environnement du système (pratique avec Docker ou un hébergeur).
2. **Vérifie `BOT_TOKEN`** et quitte avec un message clair s'il est absent.
3. **Crée le bot** et lance la connexion. Si elle échoue, l'erreur est affichée et le process s'arrête avec le code `1`.
4. **Gère l'arrêt** : sur `Ctrl+C` (`SIGINT`) ou `SIGTERM` (arrêt d'un conteneur), le bot se déconnecte avant que le process ne quitte.
5. **Affiche les promesses rejetées non gérées** au lieu de les laisser passer sans rien dire.

## L'exemple `example/index.ts`

[example/index.ts](../example/index.ts) montre l'utilisation minimale de la classe depuis l'extérieur de `src/`.
Le token est vérifié avant d'être passé au constructeur : `process.env.BOT_TOKEN` est de type `string | undefined`, et TypeScript refuse de le passer tel quel à un paramètre `string` (erreur `TS2345`). Après le `if (!token)`, TypeScript sait que `token` est une `string`.

Le dossier `example/` n'est pas inclus dans `tsconfig.json` : `npm run typecheck` ne le vérifie pas.
