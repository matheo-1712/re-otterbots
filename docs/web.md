# Interface web et API

Une interface web basique permet d'**activer ou désactiver [OtterGuard](otterguard.md)** et de modifier ses réglages sans toucher au fichier YAML. Elle peut configurer **plusieurs bots en même temps**, même s'ils tournent sur des services différents.

Aucune dépendance ajoutée : serveurs `node:http`, une page HTML, et `fetch` pour contacter les bots distants.

## Architecture

```
                   navigateur
                       │
              ┌────────▼────────┐
              │  Interface web  │  :3000  (mot de passe hors 127.0.0.1)
              └──┬──────┬────┬──┘
    accès direct │      │    │  HTTP + token
          ┌──────▼──┐ ┌─▼────▼───┐ ┌──────────┐
          │ bot du  │ │  API     │ │  API     │  :4000
          │ service │ │  bot A   │ │  bot B   │
          └─────────┘ └──────────┘ └──────────┘
```

| Élément | Fichier | Rôle |
|---|---|---|
| **API du bot** | [src/api/botApi.ts](../src/api/botApi.ts) | Chaque bot peut exposer une API JSON protégée par un token. |
| **Interface web** | [src/web/webPanel.ts](../src/web/webPanel.ts) | Sert la page et relaie chaque requête au bot choisi. Le navigateur ne parle qu'à l'interface, et ne voit jamais les tokens. |
| **Connexions** | [src/web/botConnection.ts](../src/web/botConnection.ts) | Le bot du service est modifié directement ; les autres via leur API. |

Avec `bot.run()` et `runWebPanel()`, tout se règle par les variables d'environnement ci-dessous, et les fichiers `otterbots.yml` et `panel.yml` sont cherchés à la racine du projet (à côté du `.env`). Pour les choisir depuis le code, voir [Depuis le code](#depuis-le-code).

L'interface peut tourner :

- **dans un bot** (`npm run dev` / `npm start`) : elle affiche ce bot, plus les bots listés dans `panel.yml` s'il existe ;
- **seule** (`npm run panel`) : elle n'affiche que les bots de `panel.yml`.

## Mise en place

### 1. Sur chaque bot à piloter à distance

Dans le `.env` du service :

```env
API_TOKEN=un-token-long-et-aleatoire
API_PORT=4000
API_HOST=0.0.0.0
```

| Variable | Défaut | Rôle |
|---|---|---|
| `API_TOKEN` | — | **L'API n'est lancée que s'il est défini.** 16 caractères minimum. Un token différent par bot est préférable. |
| `API_PORT` | `4000` | Port d'écoute |
| `API_HOST` | `127.0.0.1` | `0.0.0.0` pour que l'API soit joignable depuis les autres services |

Pour générer un token :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

L'adresse de l'API s'affiche dans l'[écran de connexion](affichage.md).

### 2. Sur le service qui lance l'interface

Copie [panel.example.yml](../panel.example.yml) vers `panel.yml` à la racine du projet, ou vers le fichier de ton choix indiqué dans `PANEL_CONFIG_FILE` :

```yaml
bots:
  - name: "Otterbot principal"
    url: "http://10.0.0.5:4000"
    token: "le API_TOKEN de ce bot"
```

`panel.yml` contient les tokens : il est ignoré par git. Il est lu au démarrage de l'interface, pas à chaud.

Puis, dans le `.env` :

| Variable | Défaut | Rôle |
|---|---|---|
| `WEB_PANEL` | `true` | `false` : l'interface n'est pas lancée avec le bot (ignoré par `npm run panel`) |
| `WEB_PORT` | `3000` | Port d'écoute |
| `WEB_HOST` | `127.0.0.1` | Adresse d'écoute. Par défaut, l'interface n'est accessible que depuis cette machine. |
| `WEB_PASSWORD` | — | Mot de passe demandé par le navigateur. **Obligatoire** si `WEB_HOST` n'est pas une adresse locale. |

### Scripts

| Script | Rôle |
|---|---|
| `npm run dev` / `npm start` | Le bot, avec son interface et son API (si configurées) |
| `npm run panel:dev` | L'interface seule, relancée à chaque modification |
| `npm run panel` | L'interface seule |

Si l'interface ou l'API ne peut pas démarrer avec le bot (port utilisé, token trop court…), l'erreur s'affiche en console et **le bot continue sans elle**.

## La page

La page utilise toute la largeur de l'écran :

- **À gauche**, la liste des bots avec leur photo de profil et une pastille d'état : 🟢 connecté à Discord, ⚪ API joignable mais bot hors ligne, 🔴 API injoignable ou token refusé (la raison est affichée). « Actualiser » relit leur état. Sur mobile, la liste passe en haut et défile horizontalement.
- **À droite**, le bot choisi (photo, nom, état), l'interrupteur d'OtterGuard, puis ses réglages répartis en **onglets**. L'onglet affiché est conservé quand on change de bot.

| Emplacement | Réglages | Enregistrement |
|---|---|---|
| En-tête du module | Interrupteur **Activé / Désactivé** | Immédiat |
| Onglet **Général** | Salon de logs `otterguard` (vide : aucun log), log en console (`consoleLog`), rôles exemptés (un ID par ligne) | Bouton « Enregistrer » |
| Onglet **Motifs bloqués** | Motifs (texte ou regex, raison optionnelle). Le nombre de motifs est affiché sur l'onglet. | Bouton « Enregistrer » |
| Onglet **Anti-spam** | Activation, nombre de salons, secondes, exclusion en minutes. Masqué si le bot est d'une version plus ancienne. | Bouton « Enregistrer » |

Le bouton « Enregistrer » enregistre les réglages de **tous** les onglets en une fois.

Si les réglages d'un bot ne peuvent pas être chargés (API injoignable, token refusé…), ils sont remplacés par la raison de l'erreur et un bouton « Réessayer ».

- Tout passe par `bot.config` sur le service du bot : la configuration est **validée avant d'être écrite**. Si un élément est refusé (regex dangereuse, ID mal formé…), rien n'est modifié et l'erreur s'affiche sur la page.
- Le fichier de configuration du bot (celui passé à `loadConfig`) est réécrit **en conservant ses commentaires**, puis rechargé à chaud.
- **Si un bot n'a pas chargé de fichier de configuration**, les modifications s'appliquent mais sont perdues à son redémarrage. La page affiche un avertissement.
- La page ne se met pas à jour toute seule si un fichier est modifié à la main : « Annuler les modifications » recharge la configuration active.

## API d'un bot

Toutes les routes exigent l'en-tête `Authorization: Bearer <API_TOKEN>`.

| Route | Rôle |
|---|---|
| `GET /api/bot` | État : `{ "ready": true, "tag": "Otterbot#1234", "id": "…", "avatarUrl": "https://cdn.discordapp.com/…", "guilds": 3 }` |
| `GET /api/otterguard` | Réglages actifs |
| `PUT /api/otterguard` | Remplace tous les réglages, en une seule écriture |
| `PUT /api/otterguard/enabled` | Active ou désactive OtterGuard : `{ "enabled": false }` |

```bash
curl -H "Authorization: Bearer $API_TOKEN" http://10.0.0.5:4000/api/otterguard
```

Format des réglages :

```json
{
	"enabled": true,
	"consoleLog": true,
	"antiSpam": { "enabled": true, "channels": 3, "seconds": 10, "timeoutMinutes": 10 },
	"blockedPatterns": [
		{ "type": "text", "value": "http://", "reason": "Liens non sécurisés interdits" },
		{ "type": "regex", "value": "discord\\.gg/\\w+", "reason": "" }
	],
	"exemptRoles": ["234567890123456789"],
	"logChannel": "123456789012345678",
	"persistent": true
}
```

`consoleLog` et `antiSpam` sont facultatifs dans un `PUT` : absents, les réglages du bot ne changent pas. `persistent` est en lecture seule : `false` si le bot n'a chargé aucun fichier de configuration. Une erreur renvoie `{ "error": "message" }` avec un code 4xx.

### Routes de l'interface

La page utilise les mêmes formats, préfixés par le bot : `GET /api/bots` (liste et état), puis `GET|PUT /api/bots/:id/otterguard` et `PUT /api/bots/:id/otterguard/enabled`. L'`id` vaut `local` pour le bot du service, `bot-1`, `bot-2`… pour les bots distants, dans l'ordre où ils sont donnés.

## Depuis le code

```ts
await bot.startApi({ token: 'un-token-long-et-aleatoire', port: 4000, host: '0.0.0.0' });

await bot.startWebPanel({
	port: 3000,
	password: 'secret',
	bots: [{ name: 'Otterbot de test', url: 'http://otterbot-test:4000', token: '…' }],
});
```

`bot.stop()` arrête aussi l'interface et l'API.

Interface seule, sans bot dans le process, réglée par le `.env` et `panel.yml` (voir [example/panel.ts](../example/panel.ts)) :

```ts
import { runWebPanel } from 're-otterbots';

runWebPanel();
```

Ou en passant les réglages soi-même :

```ts
import { WebPanel, createBotConnections, loadPanelBots } from 're-otterbots';

const panel = new WebPanel(createBotConnections(null, loadPanelBots('panel.yml')), { port: 3000 });
await panel.start();
```

`loadPanelBots(chemin)` est facultatif : la liste des bots peut aussi venir d'ailleurs (variables d'environnement, base de données…).

## Sécurité

L'interface et l'API modifient la configuration des bots : elles ne doivent pas être accessibles à n'importe qui.

- **Par défaut, tout n'écoute que sur `127.0.0.1`.**
- **API** : token obligatoire (16 caractères minimum), comparé en temps constant. N'expose le port qu'au réseau privé entre tes services (réseau Docker, VPN…), pas à Internet.
- **Interface** : hors adresse locale, un mot de passe est exigé (authentification HTTP Basic, le nom d'utilisateur est ignoré).
- **Tokens et mot de passe circulent en clair en HTTP.** Entre machines sur un réseau non fiable, passe par un reverse proxy HTTPS (l'`url` d'un bot peut être en `https://` et contenir un préfixe de chemin) ou un tunnel SSH (`ssh -L 3000:127.0.0.1:3000 serveur`).
- **Protection contre les autres sites** : les requêtes de modification doivent être en JSON et venir de la page elle-même (en-tête `Origin`). En écoute locale, l'en-tête `Host` doit aussi être une adresse locale, ce qui bloque le *DNS rebinding*. La page ne peut pas être intégrée dans un autre site (`frame-ancestors 'none'`).
