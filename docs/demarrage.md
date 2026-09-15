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

## Lancer le bot : `run()`

Dans le fichier principal du bot, une ligne suffit :

```ts
import { Otterbots } from 're-otterbots';

new Otterbots().run();
```

`run()` s'occupe de tout, réglé par le `.env` (voir [.env.example](../.env.example)) :

1. **Charge le `.env`** du dossier courant s'il existe. Sinon, il utilise les variables d'environnement du système (pratique avec Docker ou un hébergeur).
2. **Charge le fichier de configuration** : `CONFIG_FILE` s'il est défini, sinon `otterbots.yml` à la racine du projet, créé s'il n'existe pas ([choisir son fichier](logs.md#choisir-son-fichier--loadconfig)). Si `loadConfig` a déjà été appelé, ce fichier est gardé.
3. **Lance l'[interface web](web.md)** (sauf si `WEB_PANEL=false`), avec les bots distants de `panel.yml` s'il existe, et **l'API** si `API_TOKEN` est défini. Si l'une d'elles ne démarre pas, l'erreur est affichée et le bot continue sans elle.
4. **Connecte le bot** avec `BOT_TOKEN`. En cas d'échec (token absent ou invalide, intent privilégié non activé…), un message clair est affiché et le process s'arrête avec le code `1`.
5. **Gère l'arrêt** : sur `Ctrl+C` (`SIGINT`) ou `SIGTERM` (arrêt d'un conteneur), le bot se déconnecte avant que le process ne quitte. Les promesses rejetées non gérées sont affichées.

Pour ajouter ses propres events, il suffit de les enregistrer avant `run()` :

```ts
import { join } from 'node:path';
import { Otterbots } from 're-otterbots';

const bot = new Otterbots();
bot.loadEvents(join(__dirname, 'events'));
bot.run();
```

## La classe `Otterbots`

Définie dans [src/index.ts](../src/index.ts). `run()` suffit dans la plupart des cas ; les méthodes ci-dessous permettent de tout contrôler depuis le code.

| Méthode | Rôle |
|---|---|
| `constructor(options?)` | Crée le client Discord et enregistre les [events intégrés](events.md#events-intégrés). Options : `token` (par défaut `BOT_TOKEN`, lu au démarrage) et `intents`. `new Otterbots(token, intents?)` reste accepté. |
| `run()` | Lance tout à partir du `.env`, voir [Lancer le bot](#lancer-le-bot--run). |
| `loadConfig(chemin, options?)` | Définit le fichier YAML de configuration : chemin libre, création s'il manque, rechargement à chaud. Voir [Choisir son fichier](logs.md#choisir-son-fichier--loadconfig). |
| `addEvents(...events)` | Ajoute des events personnalisés. À appeler **avant** `start()`. Renvoie le bot, donc les appels peuvent s'enchaîner. |
| `startWebPanel(options?)` | Lance l'[interface web](web.md) pour ce bot et les bots distants donnés. Renvoie une promesse qui échoue si le serveur ne peut pas démarrer. |
| `startApi(options)` | Lance l'[API](web.md#api-dun-bot) qui permet de configurer ce bot depuis un autre service. |
| `start()` | Affiche « Connexion à Discord… » puis connecte le bot. Renvoie une promesse qui échoue si le token manque ou si la connexion est refusée (token invalide, réseau…). Ne lit pas le `.env` : c'est le rôle de `run()`. |
| `stop()` | Déconnecte proprement le bot de Discord. |

### Intents

Par défaut, le client est créé avec `Guilds`, `GuildMessages` et `MessageContent` : c'est ce dont [OtterGuard](otterguard.md) a besoin pour lire les messages. `MessageContent` est un intent **privilégié** : il faut l'activer sur le Developer Portal (onglet *Bot*, « Message Content Intent »), sinon la connexion est refusée.

Pour en demander d'autres :

```ts
const bot = new Otterbots({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
```

## Le bot d'exemple `example/`

[example/index.ts](../example/index.ts) joue le rôle d'un bot qui utilise la librairie : c'est lui qui est exécuté par `npm run dev` et `npm start`. Il se résume à `new Otterbots().run()`, et [example/panel.ts](../example/panel.ts) à `runWebPanel()`.

Il importe la librairie depuis `../src` ; un vrai bot écrirait `import { Otterbots } from 're-otterbots'`.

Le dossier `example/` n'est pas inclus dans `tsconfig.json` : `npm run typecheck` ne le vérifie pas.
