# OtterGuard : motifs bloqués

OtterGuard supprime les messages qui correspondent à des motifs définis dans la configuration, et peut envoyer un log pour chaque suppression. La vérification est dans [src/otterguard/guardMessage.ts](../src/otterguard/guardMessage.ts). Elle est appelée par deux events intégrés :

| Event | Rôle |
|---|---|
| [messageCreate.ts](../src/events/builtin/messageCreate.ts) | Vérifie chaque nouveau message |
| [messageUpdate.ts](../src/events/builtin/messageUpdate.ts) | Vérifie à nouveau un message quand son texte est modifié |

**Sans motif configuré, OtterGuard ne fait rien.** Un bot qui installe Re:Otterbots sans configurer `otterguard.blockedPatterns` ne voit aucun message supprimé.

Tous ces réglages sont aussi modifiables depuis l'[interface web](web.md).

## Configuration

```yaml
otterguard:
  enabled: true
  consoleLog: true

  antiSpam:
    enabled: true
    channels: 3
    seconds: 10
    timeoutMinutes: 10

  blockedPatterns:
    - text: "http://"
      reason: "Liens non sécurisés interdits"
    - regex: "discord\\.gg/\\w+"
      reason: "Invitations Discord interdites"
    - "mot interdit"

  exemptRoles:
    - "234567890123456789"
```

### Activation

`enabled: false` désactive OtterGuard sans perdre les motifs : aucun message n'est vérifié. Absent, il vaut `true`.

### Log en console

`consoleLog: true` (par défaut) écrit une ligne dans la console du bot à chaque suppression, **même si aucun salon de logs n'est configuré** :

```
[otterguard] Message supprimé · serveur 1234… · salon 2345… · auteur 3456… · motif « Liens non sécurisés interdits »
```

- Seulement des **IDs** et le motif (sa `reason` si elle existe) : **jamais le contenu du message**. Les logs d'un service sont souvent conservés longtemps et lisibles par des personnes qui ne sont pas modératrices ; le détail reste dans le salon Discord.
- Utile pour vérifier qu'un motif ne supprime pas trop de messages, ou garder une trace quand l'envoi du log Discord échoue.
- `consoleLog: false` : plus rien en console, par exemple si les suppressions sont nombreuses.

### Anti-spam

Protège contre les comptes piratés et les bots qui publient la même arnaque dans tous les salons. Il est vérifié sur chaque **nouveau** message, dans [src/otterguard/antiSpam.ts](../src/otterguard/antiSpam.ts).

| Réglage | Défaut | Rôle |
|---|---|---|
| `enabled` | `false` | Active l'anti-spam |
| `channels` | `3` | Nombre de salons **différents** (2 à 50)… |
| `seconds` | `10` | … dans lesquels un même auteur écrit en moins de ce nombre de secondes (1 à 300) |
| `timeoutMinutes` | `10` | Exclusion temporaire du spammeur, en minutes. `0` : aucune. 40 320 (28 jours) maximum. |

Quand un auteur atteint le seuil :

1. **Tous ses messages de la rafale sont supprimés**, dans chaque salon.
2. S'il continue, ses nouveaux messages sont supprimés d'office tant qu'il n'a pas arrêté pendant `seconds` secondes.
3. Il est **exclu temporairement** si `timeoutMinutes` est supérieur à 0 et que le bot en a le droit.
4. **Un seul log** par rafale : une ligne en console si `consoleLog` est activé (IDs, nombre de salons, action), et un embed dans le salon `otterguard` s'il est configuré (auteur, salons, contenu du message déclencheur, action).

À savoir :

- **Le contenu n'est pas comparé** : un spam varie souvent le texte ou n'envoie que des images. C'est le nombre de salons différents en peu de temps qui compte, ce qu'un humain ne fait presque jamais.
- **Les bots sont vérifiés aussi**, sauf le bot lui-même et les webhooks. Un bot de confiance qui publie dans plusieurs salons à la suite (logs, annonces) doit avoir un **rôle exempté** : chaque bot a un rôle à son nom.
- Les **rôles exemptés** s'appliquent à l'anti-spam comme aux motifs.
- L'activité récente est gardée en mémoire : un redémarrage du bot remet les compteurs à zéro.

### Motifs bloqués

Chaque motif est l'un de ces trois formats :

| Format | Rôle |
|---|---|
| `- "texte"` | Raccourci pour `text` |
| `- text: "…"` | Texte recherché tel quel. Les caractères spéciaux (`.`, `?`, `*`…) n'ont pas de sens particulier. |
| `- regex: "…"` | Expression régulière. Entre guillemets doubles, les antislashs se doublent : `"discord\\.gg"`. |

- `reason` est optionnel. Il est affiché dans le log à la place du motif.
- La recherche est **insensible à la casse** et porte sur **n'importe quelle partie** du message.
- Un motif ne peut pas avoir à la fois `text` et `regex`.

### Rôles exemptés

`exemptRoles` liste les IDs des rôles dont les messages ne sont **jamais** vérifiés, typiquement les modérateurs. Un membre qui a au moins un de ces rôles est exempté.

Aucun rôle n'est exempté par défaut, pas même les administrateurs : c'est à la configuration de le décider.

### Validation

Si un élément est invalide (motif refusé, ID mal formé…), **toute la modification est refusée** et la configuration précédente reste active. L'erreur s'affiche en console. Voir [rechargement à chaud](logs.md#rechargement-à-chaud).

## Protection contre les regex lentes

Certaines expressions régulières peuvent prendre un temps exponentiel sur un message bien choisi (*backtracking catastrophique*). Comme la vérification est synchrone, une telle regex **bloquerait tout le bot**. Chaque motif est donc contrôlé au chargement :

| Règle | Exemple refusé |
|---|---|
| 100 motifs maximum | — |
| 200 caractères maximum par motif | — |
| Pas de répétition imbriquée : un groupe qui contient `*`, `+` ou `{n,}` ne peut pas lui-même être répété | `(a+)+`, `(\w*)*`, `((ab)+){2,}` |
| Pas de référence arrière | `(a)\1`, `(?<x>a)\k<x>` |

Les motifs `text` sont toujours sûrs : ils sont échappés avant d'être transformés en regex.

Ces règles s'appliquent de la même façon au fichier YAML et à `setBlockedPatterns`. Une interface web n'a donc rien de plus à vérifier.

**Limite :** la détection couvre les cas les plus courants, mais pas tous. Une alternative dont les branches se recouvrent et qui est répétée, comme `(a|aa)+`, passe le contrôle et peut rester lente. Si des personnes non fiables peuvent saisir des regex, préfère ne leur proposer que des motifs `text`.

## Comportement

Pour chaque message nouveau ou modifié :

1. Les **messages privés**, les **webhooks** et les messages **du bot lui-même** sont ignorés.
2. Si OtterGuard est désactivé, ou si l'auteur a un **rôle exempté**, rien ne se passe.
3. **Nouveau message** : l'[anti-spam](#anti-spam) vérifie l'auteur, bots compris. Si c'est du spam, le message est supprimé et la vérification s'arrête là.
4. Les messages **d'autres bots** ne sont pas comparés aux motifs. Sans motif configuré, rien ne se passe.
5. Le contenu est comparé aux motifs, dans l'ordre. Le premier qui correspond l'emporte.
6. Le message est **supprimé**.
7. Si `consoleLog` est activé, une ligne est écrite dans la console du bot (IDs et motif, sans le contenu).
8. Si un salon `otterguard` est défini dans `logs.channels`, un log y est envoyé avec l'auteur, le salon, le motif et le contenu (tronqué à 1000 caractères). Son titre est « Message bloqué » ou « Message modifié bloqué ». Sans salon configuré, rien n'est envoyé.

### Messages modifiés

- **Modifications sans changement de texte** : Discord signale aussi une modification quand l'aperçu d'un lien apparaît. Si le texte n'a pas changé, le message n'est pas revérifié.
- **Messages envoyés avant le démarrage du bot** : leurs modifications ne sont pas détectées, car discord.js ne signale que les modifications des messages qu'il a en mémoire. Pour les couvrir, il faudrait activer les *partials* (`Partials.Message`) sur le client.

## Prérequis Discord

| Besoin | Pourquoi |
|---|---|
| Intent `GuildMessages` | Recevoir les messages et leurs modifications |
| Intent `MessageContent` (privilégié, à activer sur le Developer Portal) | Sans lui, `message.content` est vide et aucun motif ne correspond jamais |
| Permission « Gérer les messages » dans les salons surveillés | Supprimer les messages. Sans elle, l'erreur s'affiche en console et le bot continue. |
| Permission « Exclure temporairement des membres » (anti-spam avec `timeoutMinutes`) | Exclure le spammeur. Le rôle du bot doit être **au-dessus** de celui du spammeur. Sans cela, les messages sont quand même supprimés et le log indique « exclusion impossible ». |

## Modifier depuis le code

C'est ce qu'utilise l'[interface web](web.md) :

```ts
bot.config.setOtterguardEnabled(false);

bot.config.setBlockedPatterns([
	{ text: 'http://', reason: 'Liens non sécurisés interdits' },
	{ regex: 'discord\\.gg/\\w+' },
]);

bot.config.setExemptRoles(['234567890123456789']);

// Tous les réglages en une seule écriture, salon de logs compris (null pour le retirer)
bot.config.updateOtterguard({
	enabled: true,
	blockedPatterns: [{ text: 'http://' }],
	exemptRoles: [],
	logChannel: '123456789012345678',
});
```

`setBlockedPatterns`, `setExemptRoles` et `updateOtterguard` remplacent toute la liste. Toutes valident **avant** d'écrire : si un élément est refusé, elles lèvent une erreur (dont le message peut être affiché tel quel à l'utilisateur) et ni la configuration ni le fichier ne sont modifiés.

La configuration active est disponible dans `bot.config.current.otterguard`.
