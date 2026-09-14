# Documentation Re:Otterbots

Re:Otterbots est une base de bot Discord en TypeScript, construite sur [discord.js v14](https://discord.js.org).

| Page | Contenu |
|---|---|
| [Démarrage](demarrage.md) | Installation, configuration du token, scripts npm, cycle de vie du bot |
| [Events](events.md) | Écrire et enregistrer des events avec `defineEvent` |
| [Écran de connexion](affichage.md) | La bannière affichée dans la console quand le bot se connecte |

## Arborescence

```
re-otterbots/
├── src/
│   ├── index.ts              ← classe Otterbots (point d'entrée de la librairie)
│   ├── main.ts               ← lance le bot (npm run dev / npm start)
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
├── example/
│   └── index.ts              ← exemple d'utilisation de la classe
├── .env.example              ← modèle de fichier .env
├── tsconfig.json
└── package.json
```

## En bref

```ts
import { join } from 'node:path';
import { Otterbots } from '../src';

const bot = new Otterbots(token);

// Charge tous les fichiers du dossier events/
bot.loadEvents(join(__dirname, 'events'));

await bot.start();
```
