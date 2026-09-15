# Écran de connexion

Quand un bot Re:Otterbots se connecte, la console affiche une bannière avec les informations du bot. Le code est dans [src/display/banner.ts](../src/display/banner.ts).

```
Connexion à Discord…

   ___         _    ___    _     _                 _            _
  | _ \  ___  (_)  / _ \  | |_  | |_   ___   _ _  | |__   ___  | |_   ___
  |   / / -_)  _  | (_) | |  _| |  _| / -_) | '_| | '_ \ / _ \ |  _| (_-<
  |_|_\ \___| (_)  \___/   \__|  \__| \___| |_|   |_.__/ \___/  \__| /__/

  ╭──────────────────────────────────╮
  │ Bot          Otter#1234          │
  │ ID           123456789012345678  │
  │ Serveurs     3                   │
  │ Démarrage    1240 ms             │
  │ discord.js   v14.27.0            │
  │ Node.js      v24.x.x             │
  ╰──────────────────────────────────╯

  ● En ligne — Ctrl+C pour arrêter
  Inviter : https://discord.com/oauth2/authorize?client_id=…
```

## Quand s'affiche-t-il ?

| Moment | Fonction | Appelée par |
|---|---|---|
| Au lancement | `printConnecting()` | `Otterbots.start()` |
| Bot prêt | `printReadyBanner(client, startupMs)` | l'event intégré [ready.ts](../src/events/builtin/ready.ts) |
| Avertissement discord.js | `printWarning(message)` | l'event intégré [warn.ts](../src/events/builtin/warn.ts) |

## Avertissements

Les avertissements de discord.js (`Events.Warn`) arrivent souvent **pendant** la connexion. Pour ne pas couper l'écran d'accueil, ils sont mis en attente puis affichés **sous** la bannière :

```
  ● En ligne — Ctrl+C pour arrêter
  Inviter : https://discord.com/oauth2/authorize?client_id=…

  ▲ [discord.js] …
```

- Avant la bannière, `printWarning` stocke le message.
- `printReadyBanner` affiche la bannière puis appelle `releaseWarnings()`, qui affiche les messages en attente.
- Les avertissements suivants s'affichent directement.
- Si la connexion échoue, la bannière ne s'affiche jamais : `Otterbots.start()` appelle alors `releaseWarnings()` avant de renvoyer l'erreur, pour que les avertissements ne soient pas perdus.

Seuls les avertissements sont retardés : les erreurs (`Events.Error`) s'affichent immédiatement.

## Contenu

| Ligne | Source |
|---|---|
| Bot | `client.user.tag` |
| ID | `client.user.id` |
| Serveurs | nombre de serveurs du bot (`client.guilds.cache.size`) |
| Démarrage | temps écoulé depuis le lancement du process (`performance.now()`), chargement du code compris |
| discord.js | version installée |
| Node.js | `process.version` |
| Inviter | lien d'invitation avec les scopes `bot` et `applications.commands` |

## Fonctionnement

- **Couleurs** : codes ANSI du terminal, sans dépendance. Le titre a un dégradé turquoise → bleu, une couleur par ligne.
- **Titre** : chaque lettre de « Re:Otterbots » est stockée sur 4 lignes (police figlet *small*). Les lettres sont assemblées ligne par ligne, séparées par un espace pour ne pas se toucher.
- **Encadré** : la largeur est calculée sur le texte **avant** l'ajout des couleurs, puisque les codes ANSI ne prennent pas de place à l'écran. Il s'adapte donc à la longueur des valeurs.
- **Sans couleurs** : si la sortie n'est pas un terminal (logs redirigés vers un fichier, Docker…) ou si la variable `NO_COLOR` est définie, le texte s'affiche sans codes couleur.

## Limites

Dans l'ancienne console Windows PowerShell, les bords de l'encadré ou les accents peuvent mal s'afficher si le terminal n'est pas en UTF-8. Windows Terminal et les terminaux des IDE les affichent correctement.
