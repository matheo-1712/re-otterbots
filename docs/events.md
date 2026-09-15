# Events

Le client discord.js émet des **événements** pendant qu'il tourne : connexion terminée, message reçu, serveur rejoint, erreur… Un event Re:Otterbots associe un de ces événements à une fonction à exécuter.

**Règle : un fichier = un event, exporté par défaut.** Le bot charge automatiquement tous les fichiers d'un dossier, sans liste à tenir à jour.

## Écrire un event

```ts
// events/guildJoin.ts
import { Events } from 'discord.js';
import { defineEvent } from 're-otterbots';

export default defineEvent({
	name: Events.GuildCreate,
	execute(guild) {
		console.log(`Ajouté sur le serveur ${guild.name}`);
	},
});
```

| Champ | Type | Rôle |
|---|---|---|
| `name` | `keyof ClientEvents` | L'événement discord.js à écouter. Utilise l'enum `Events` (`Events.MessageCreate`, `Events.GuildCreate`…). |
| `once` | `boolean` (optionnel) | `true` : l'event ne s'exécute qu'une seule fois. Par défaut, il s'exécute à chaque occurrence. |
| `execute` | fonction, synchrone ou `async` | Reçoit les arguments de l'événement, puis **le bot** en dernier argument. |

### Accéder au bot depuis un event

Le dernier argument de `execute` est l'instance `Otterbots`. Elle donne accès à la configuration et aux logs :

```ts
export default defineEvent({
	name: Events.GuildMemberAdd,
	async execute(member, bot) {
		await bot.logs.send('arrivees', { title: `${member.user.tag} a rejoint le serveur` });
	},
});
```

Un event qui n'en a pas besoin peut simplement ignorer cet argument : `execute(guild) { … }`.

### Pourquoi passer par `defineEvent` ?

`defineEvent` renvoie simplement l'objet qu'on lui donne : il ne fait rien quand le code tourne. Il sert au **typage**. TypeScript déduit les paramètres de `execute` à partir de `name` :

- `Events.GuildCreate` → `execute(guild: Guild)`
- `Events.MessageCreate` → `execute(message: Message)`
- `Events.ClientReady` → `execute(client: Client<true>)`

Sans `defineEvent`, il faudrait écrire ces types à la main, avec le risque de se tromper.

## Enregistrer des events

### Charger un dossier : `loadEvents` (recommandé)

```ts
import { join } from 'node:path';

const bot = new Otterbots(token);
bot.loadEvents(join(__dirname, 'events'));
await bot.start();
```

`loadEvents` ([src/events/loadEvents.ts](../src/events/loadEvents.ts)) :

1. Liste les fichiers `.ts` et `.js` du dossier (les `.d.ts` et `.js.map` sont ignorés), dans l'ordre alphabétique. Les sous-dossiers ne sont pas parcourus.
2. Charge chaque fichier et récupère son **export par défaut**.
3. Vérifie que c'est bien un event (un `name` et une fonction `execute`). Sinon, le fichier est ignoré avec un avertissement :
   ```
   [events] guildJoin.ts ignoré : il doit contenir « export default defineEvent({ … }) »
   ```
4. Branche chaque event sur le client.

Utilise `join(__dirname, 'events')` plutôt qu'un chemin relatif comme `'./events'` : un chemin relatif dépend du dossier depuis lequel on lance le bot, alors que `__dirname` désigne toujours le dossier du fichier courant. Ça marche aussi bien avec `tsx` (fichiers `.ts`) qu'après compilation (fichiers `.js` dans `dist/`).

### Ajouter un event à la main : `addEvents`

Pour un event défini ailleurs que dans un dossier chargé (un test, un event créé dynamiquement…) :

```ts
import guildJoin from './events/guildJoin';

bot.addEvents(guildJoin);
```

`loadEvents` et `addEvents` renvoient le bot, donc les appels peuvent s'enchaîner. Les deux doivent être appelés **avant** `start()` : un event `ClientReady` ajouté après la connexion ne se déclencherait jamais.

## Events intégrés

Le constructeur d'`Otterbots` charge automatiquement le dossier [src/events/builtin/](../src/events/builtin), sur **tous** les bots. Pour ajouter un event intégré, il suffit de créer un fichier dans ce dossier.

| Fichier | Événement | Rôle |
|---|---|---|
| [ready.ts](../src/events/builtin/ready.ts) | `ClientReady` (une fois) | Affiche l'[écran de connexion](affichage.md) |
| [warn.ts](../src/events/builtin/warn.ts) | `Warn` | Affiche les avertissements non bloquants de discord.js, sous l'[écran de connexion](affichage.md#avertissements) |
| [error.ts](../src/events/builtin/error.ts) | `Error` | Affiche les erreurs de discord.js |
| [messageCreate.ts](../src/events/builtin/messageCreate.ts) | `MessageCreate` | [OtterGuard](otterguard.md) : [anti-spam](otterguard.md#anti-spam) (même auteur dans plusieurs salons, bots compris), puis suppression des messages qui correspondent aux motifs configurés. Ne fait rien sans configuration. |
| [messageUpdate.ts](../src/events/builtin/messageUpdate.ts) | `MessageUpdate` | [OtterGuard](otterguard.md) : même vérification quand un message est modifié |

L'event `error` est indispensable : le client hérite de l'`EventEmitter` de Node.js, et un événement `error` émis **sans listener** fait planter le process.

`messageCreate` ne reçoit des messages que si le bot a l'intent `GuildMessages`, et `message.content` n'est rempli qu'avec l'intent privilégié `MessageContent`. Voir [Intents](demarrage.md#intents).

## Les erreurs ne font pas planter le bot

Chaque `execute` est entouré d'un `try/catch` ([src/events/defineEvent.ts](../src/events/defineEvent.ts)). Si un event lève une exception (ou si sa promesse échoue), l'erreur est affichée avec le nom de l'event et le bot continue de tourner :

```
[events] Erreur dans l'event « guildCreate » : Error: …
```

Pas besoin de remettre un `try/catch` global dans chaque event.

## Comparaison avec Otterbots

Dans [Otterbots](https://github.com/L-Antre-des-Loutres/Otterbots), chaque event intégré est une fonction qui appelle `client.on(...)` elle-même (par exemple `otterBots_initEmoteReact(client)`), et il faut penser à l'appeler au démarrage.
Dans Re:Otterbots, un event est un **objet** (`name`, `once`, `execute`) placé dans un fichier. Le bot le découvre et le branche tout seul. On y gagne le typage automatique, une gestion d'erreur commune à tous les events, et plus aucune liste à maintenir.
