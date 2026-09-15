# Logs Discord et configuration

Re:Otterbots peut envoyer des logs sous forme d'embeds dans des salons Discord. Chaque salon est désigné par un **nom** (`otterguard`, `moderation`…) associé à son ID dans un fichier YAML. Le fichier est rechargé à chaud : un changement s'applique sans redémarrer le bot.

Prérequis : `npm install yaml`

## Configuration

Dans le bot d'exemple, copie [otterbots.example.yml](../otterbots.example.yml) vers `otterbots.yml`, à la racine du projet comme le `.env` (ou lance le bot : le fichier est créé vide) :

```yaml
logs:
  channels:
    otterguard: "123456789012345678"
```

- Mets les IDs **entre guillemets**. Sans guillemets, ils sont quand même lus correctement, mais c'est plus sûr.
- Pour copier l'ID d'un salon : active le mode développeur de Discord, puis clic droit sur le salon > *Copier l'identifiant du salon*.
- `otterbots.yml` est ignoré par git : chaque déploiement a ses propres salons.

### Choisir son fichier : `loadConfig`

Re:Otterbots est pensé pour être publié comme module npm : la librairie n'impose aucun fichier ni aucun chemin. Chaque bot définit le sien avec `loadConfig` :

```ts
bot.loadConfig('chemin/vers/ma-config.yml', { ifMissing: 'create', watch: true });
```

| Paramètre | Rôle |
|---|---|
| `chemin` | N'importe quel fichier YAML. Un chemin relatif part du dossier courant (`process.cwd()`) ; utilise `join(__dirname, …)` pour partir du fichier du bot. |
| `ifMissing` | Si le fichier n'existe pas : `'error'` (défaut) lève une erreur, `'create'` crée le fichier et ses dossiers avec la configuration actuelle (commentée), `'ignore'` ne fait rien et la configuration reste en mémoire. |
| `watch` | `true` (défaut) : le fichier est surveillé et rechargé à chaud. `false` : il n'est lu qu'au chargement, mais les modifications de l'interface web y sont toujours enregistrées. |

- **Sans `loadConfig()`**, la configuration est vide : aucun salon de logs, aucun fichier lu ni écrit. `bot.logs.send()` renvoie `false` avec un avertissement.
- **`setLogChannel()` sans fichier** modifie la configuration en mémoire uniquement.
- Appeler `loadConfig` une seconde fois remplace le fichier utilisé.

Exemples :

```ts
// Fichier obligatoire, à côté du bot
bot.loadConfig(join(__dirname, 'otterbots.yml'));

// Chemin défini par l'hébergeur, créé au premier lancement
bot.loadConfig(process.env.CONFIG_FILE ?? '/data/otterbots.yml', { ifMissing: 'create' });

// Fichier facultatif, jamais rechargé à chaud
bot.loadConfig('config.yml', { ifMissing: 'ignore', watch: false });
```

Le bot d'exemple [example/index.ts](../example/index.ts) utilise `CONFIG_FILE` (dans le `.env`) s'il est défini, sinon `otterbots.yml` à la racine du projet, à côté du `.env`. Il le crée s'il n'existe pas :

```ts
bot.loadConfig(process.env.CONFIG_FILE || 'otterbots.yml', { ifMissing: 'create' });
```

## Envoyer un log

```ts
await bot.logs.send('otterguard', {
	level: 'warn',
	title: 'Raid suspecté',
	description: '12 comptes créés il y a moins d\'une heure ont rejoint en 30 secondes.',
	fields: [
		{ name: 'Serveur', value: guild.name, inline: true },
		{ name: 'Action', value: 'Salon verrouillé', inline: true },
	],
});
```

| Champ | Rôle |
|---|---|
| `level` | `info` (défaut, bleu ℹ️), `success` (vert ✅), `warn` (jaune ⚠️), `error` (rouge ⛔) |
| `title` | Titre de l'embed, précédé de l'icône du niveau |
| `description` | Texte principal (optionnel) |
| `fields` | Champs de l'embed (optionnel) |

L'embed est horodaté automatiquement.

### Comportement

- **Le salon est relu à chaque envoi** : si la configuration change, le log suivant part dans le nouveau salon.
- **`send` ne lève jamais d'erreur.** Un log qui échoue ne doit pas faire planter la fonctionnalité qui l'envoie. `send` renvoie `true` si le message est parti, sinon `false` avec un message en console :
  - aucun salon configuré pour ce nom ;
  - salon introuvable, ou le bot n'a pas la permission d'y écrire ;
  - erreur de l'API Discord.
- **Avant la connexion**, l'envoi attend que le bot soit prêt.

Dans un event, le bot est accessible si tu gardes une référence vers lui, par exemple en exportant l'instance depuis ton fichier principal.

## Rechargement à chaud

[src/config/configStore.ts](../src/config/configStore.ts) surveille le fichier :

- À chaque enregistrement, le fichier est relu et le message `[config] Configuration rechargée` s'affiche.
- **Si le fichier est invalide** (YAML cassé, ID mal formé), la modification est ignorée : la configuration précédente reste active et l'erreur s'affiche en console.
- Le dossier est surveillé, pas le fichier seul, car beaucoup d'éditeurs remplacent le fichier en l'enregistrant.

### Réagir à un changement

```ts
bot.config.on('change', (config) => {
	console.log('Nouveaux salons de logs :', config.logs.channels);
});
```

## Préparé pour une interface web

`bot.config` expose des méthodes pour modifier la configuration depuis le code. C'est ce qu'appellera une future interface web :

| Méthode | Rôle |
|---|---|
| `setLogChannel(nom, channelId)` | Associe un nom à un salon. Lève une erreur si l'ID n'est pas valide. |
| `removeLogChannel(nom)` | Retire un salon de logs |
| `getLogChannel(nom)` | ID du salon, ou `undefined` |
| `current` | Configuration complète, en lecture seule |

`setLogChannel` et `removeLogChannel` mettent à jour la configuration en mémoire, **réécrivent le fichier YAML en conservant ses commentaires**, puis émettent `change`. Le fichier reste donc la seule source de vérité : modifié à la main ou via l'interface, le résultat est le même.

Exemple de future route d'API :

```ts
app.put('/api/logs/:name', (req, res) => {
	try {
		bot.config.setLogChannel(req.params.name, req.body.channelId);
		res.json(bot.config.current.logs.channels);
	}
	catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
});
```
