# re-otterbots

Moteur TypeScript pour construire des bots Discord au-dessus de
[discord.js](https://discord.js.org) v14.

> ⚠️ `src/` est encore vide : le moteur reste à écrire. Le contrat d'API attendu
> est spécifié dans [`examples/README.md`](examples/README.md), et les exemples
> comme les tests sont déjà écrits contre lui.

## Installation

```bash
npm install
```

Node ≥ 20.11 (voir `.nvmrc`). `discord.js` est une **peer dependency** : le
projet consommateur fournit sa propre version.

## Structure

```
src/            le moteur (point d'entrée : src/index.ts)
examples/       bots de démonstration, lancés pour les tests manuels
tests/          helpers de test partagés + tests d'intégration
```

## Scripts

| Script                                      | Rôle                                             |
| ------------------------------------------- | ------------------------------------------------ |
| `npm run dev`                               | Build du moteur en watch                         |
| `npm run build`                             | Bundle ESM + déclarations de types dans `dist/`  |
| `npm run example`                           | Lance le bot d'exemple avec rechargement à chaud |
| `npm run example:deploy`                    | Enregistre les slash commands de l'exemple       |
| `npm run typecheck`                         | `tsc --noEmit` sur le moteur et les tests        |
| `npm run typecheck:examples`                | Idem sur les exemples                            |
| `npm run lint` / `lint:fix`                 | ESLint (flat config, règles type-checked)        |
| `npm run format` / `format:check`           | Prettier                                         |
| `npm test` / `test:watch` / `test:coverage` | Vitest                                           |
| `npm run check`                             | Tout ce qui précède, dans l'ordre du CI          |

## Workflow

- **Commits** : pas de hook, pas de contrainte. Le style [Conventional Commits](https://www.conventionalcommits.org)
  reste une convention libre, plus rien ne la vérifie.
- **Qualité** : `npm run check` avant de pousser si tu veux vérifier en local ;
  sinon le CI fait le travail sur la PR.
- **CI** : GitHub Actions sur `main` et les PR — lint, typecheck, tests
  (Node 20 et 22), build.
- **Dépendances** : Dependabot hebdomadaire (npm) et mensuel (actions).
- **Issues** : trois formulaires dans `.github/ISSUE_TEMPLATE/` — bug, évolution,
  tâche technique. Les issues vierges restent autorisées.

## Démarrer le bot d'exemple

```bash
cp examples/.env.example examples/.env
npm run example:deploy
npm run example
```

Détails dans [`examples/README.md`](examples/README.md), helpers de test dans
[`tests/README.md`](tests/README.md).

## Licence

MIT

## WebStorm

Les run configurations et les réglages partageables sont versionnés dans
`.idea/` : clone le repo n'importe où, ouvre-le, et les 17 commandes sont déjà
dans le sélecteur de configurations.

Versionné : `runConfigurations/`, `codeStyles/`, `inspectionProfiles/`,
`jsLinters/eslint.xml`, `prettier.xml`, `vcs.xml`.
Ignoré : `workspace.xml`, `shelf/`, `tasks.xml`, `*.iml` — état local, propre à
chaque machine.

Réglages appliqués à l'ouverture : ESLint et Prettier en _fix on save_,
indentation 2 espaces, marge droite à 100, inspection `JSUnusedGlobalSymbols`
désactivée (sur une lib, l'API publique paraît toujours inutilisée).

Deux configurations sortent du lot :

- **16. Debug : exemple** — configuration Node.js (et non npm), donc les points
  d'arrêt fonctionnent dans le TypeScript. Elle lance
  `examples/basic-bot/index.ts` via `--import tsx`.
- **17. Vitest : tous les tests** — donne l'arbre de tests et les icônes de
  gouttière pour relancer un test isolé.

Si tu ajoutes une configuration depuis l'IDE, coche **Store as project file**
pour qu'elle atterrisse dans `.idea/runConfigurations/` et soit versionnée.
