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
| `npm run dev` | Lance le bot d'exemple avec `tsx` et le relance à chaque modification d'un fichier |
| `npm start` | Lance le bot d'exemple une fois, sans surveillance des fichiers |
| `npm run panel` / `npm run panel:dev` | Lance l'[interface web](web.md) seule du bot d'exemple, pour piloter des bots distants |
| `npm run build` | Compile la librairie (`src/`) dans `dist/` |
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
| `loadConfig(chemin, options?)` | Définit le fichier YAML de configuration : chemin libre, création s'il manque, rechargement à chaud. Voir [Choisir son fichier](logs.md#choisir-son-fichier--loadconfig). |
| `addEvents(...events)` | Ajoute des events personnalisés. À appeler **avant** `start()`. Renvoie le bot, donc les appels peuvent s'enchaîner. |
| `startWebPanel(options?)` | Lance l'[interface web](web.md) pour ce bot et les bots distants donnés. Renvoie une promesse qui échoue si le serveur ne peut pas démarrer. |
| `startApi(options)` | Lance l'[API](web.md#api-dun-bot) qui permet de configurer ce bot depuis un autre service. |
| `start()` | Affiche « Connexion à Discord… » puis connecte le bot. Renvoie une promesse qui échoue si la connexion est refusée (token invalide, réseau…). |
| `stop()` | Déconnecte proprement le bot de Discord. |

### Intents

Par défaut, le client est créé avec le seul intent `Guilds`, suffisant pour se connecter et connaître la liste des serveurs. Pour en demander d'autres, passe-les en second argument :

```ts
const bot = new Otterbots(token, [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]);
```

Un event qui lit les messages demandera en plus `GuildMessages` et `MessageContent`. `MessageContent` est un intent **privilégié** : il faut aussi l'activer sur le Developer Portal.

## Le bot d'exemple `example/`

La librairie ne se configure pas elle-même : elle sera installée comme module npm, ses fichiers ne doivent pas être modifiés. [example/index.ts](../example/index.ts) joue le rôle d'un bot qui l'utilise, et c'est lui qui est exécuté par `npm run dev` et `npm start`. Dans l'ordre, il :

1. **Charge le `.env`** s'il existe. Sinon, il utilise les variables d'environnement du système (pratique avec Docker ou un hébergeur).
2. **Vérifie `BOT_TOKEN`** et quitte avec un message clair s'il est absent.
3. **Crée le bot** et charge le fichier de configuration : `CONFIG_FILE` s'il est défini, sinon `otterbots.yml` à la racine du projet (à côté du `.env`), créé s'il n'existe pas ([choisir son fichier](logs.md#choisir-son-fichier--loadconfig)).
4. **Lance l'[interface web](web.md)** (sauf si `WEB_PANEL=false`), l'API (si `API_TOKEN` est défini) et la connexion. Si la connexion échoue, l'erreur est affichée et le process s'arrête avec le code `1`.
5. **Gère l'arrêt** : sur `Ctrl+C` (`SIGINT`) ou `SIGTERM` (arrêt d'un conteneur), le bot se déconnecte avant que le process ne quitte.
6. **Affiche les promesses rejetées non gérées** au lieu de les laisser passer sans rien dire.

Il importe la librairie depuis `../src` ; un vrai bot écrirait `import { Otterbots } from 're-otterbots'`.

Le token est vérifié avant d'être passé au constructeur : `process.env.BOT_TOKEN` est de type `string | undefined`, et TypeScript refuse de le passer tel quel à un paramètre `string` (erreur `TS2345`). Après le `if (!token)`, TypeScript sait que `token` est une `string`.

Le dossier `example/` n'est pas inclus dans `tsconfig.json` : `npm run typecheck` ne le vérifie pas.
