# Documentation Re:Otterbots

Re:Otterbots est une base de bot Discord en TypeScript, construite sur [discord.js v14](https://discord.js.org).

| Page | Contenu |
|---|---|
| [Démarrage](demarrage.md) | Installation, configuration du token, scripts npm, cycle de vie du bot |
| [Events](events.md) | Écrire et enregistrer des events avec `defineEvent` |
| [Écran de connexion](affichage.md) | La bannière affichée dans la console quand le bot se connecte |
| [Logs Discord et configuration](logs.md) | Envoyer des logs dans des salons définis en YAML, rechargement à chaud |
| [OtterGuard](otterguard.md) | Supprimer les messages qui correspondent à des motifs bloqués |
| [Interface web et API](web.md) | Activer, désactiver et configurer OtterGuard sur un ou plusieurs bots depuis le navigateur |

## Arborescence

```
re-otterbots/
├── src/
│   ├── index.ts              ← classe Otterbots (point d'entrée de la librairie)
│   ├── config/
│   │   └── configStore.ts    ← lecture du YAML, rechargement à chaud, modification
│   ├── logs/
│   │   └── discordLogs.ts    ← envoi de logs dans les salons Discord
│   ├── api/
│   │   ├── botApi.ts         ← API d'un bot, protégée par token
│   │   ├── otterguardPayload.ts ← format JSON des réglages d'OtterGuard
│   │   └── http.ts           ← utilitaires HTTP partagés
│   ├── web/
│   │   ├── webPanel.ts       ← serveur de l'interface web
│   │   ├── botConnection.ts  ← accès au bot local ou à un bot distant
│   │   ├── panelConfig.ts    ← lecture d'une liste de bots distants en YAML
│   │   └── panelPage.ts      ← page HTML de l'interface
│   ├── display/
│   │   └── banner.ts         ← écran de connexion en console
│   └── events/
│       ├── defineEvent.ts    ← déclarer un event et le brancher sur le client
│       ├── loadEvents.ts     ← charger automatiquement les events d'un dossier
│       └── builtin/          ← events intégrés, chargés sur tous les bots
│           ├── ready.ts
│           ├── warn.ts
│           ├── error.ts
│           └── messageCreate.ts
├── example/                  ← bot d'exemple : toute la configuration est ici, pas dans src/
│   ├── index.ts              ← lance le bot, son interface web et son API (npm run dev / npm start)
│   └── panel.ts              ← lance l'interface web seule (npm run panel)
├── .env.example              ← modèle de fichier .env du bot d'exemple
├── otterbots.example.yml     ← modèle de configuration (à copier en otterbots.yml)
├── panel.example.yml         ← bots pilotés par l'interface (à copier en panel.yml)
├── tsconfig.json
└── package.json
```

Re:Otterbots est destiné à être installé comme module npm : **`src/` ne lit ni `.env` ni fichier de configuration et n'impose aucun chemin.** C'est le bot qui l'utilise, ici [example/](../example/), qui choisit ses fichiers et passe les réglages à la librairie.

## En bref

```ts
import { join } from 'node:path';
import { Otterbots } from '../src';

const bot = new Otterbots(token);

// Charge tous les fichiers du dossier events/
bot.loadEvents(join(__dirname, 'events'));

await bot.start();
```
