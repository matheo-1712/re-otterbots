# Re:Otterbots 
*Re:start [Otterbots](https://github.com/L-Antre-des-Loutres/Otterbots) from zero*

## Démarrage rapide

```bash
npm install
cp .env.example .env   # puis renseigner BOT_TOKEN
npm run dev
```

## Installation du package

Depuis npm :

```bash
npm install re-otterbots
```

Depuis GitHub Packages, ajouter dans le `.npmrc` du projet (le token doit avoir le scope `read:packages`) :

```ini
@matheo-1712:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

puis :

```bash
npm install @matheo-1712/re-otterbots
```

## Utilisation

Crée un `.env` avec `BOT_TOKEN=ton_token` (les autres réglages sont décrits dans [.env.example](.env.example)), puis :

```ts
import { Otterbots } from 're-otterbots';

new Otterbots().run();
```

La documentation complète est dans [docs/](docs/README.md).