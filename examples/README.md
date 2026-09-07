# Exemples

Bacs à sable pour lancer et tester le moteur en conditions réelles.

`examples/tsconfig.json` mappe `re-otterbots` vers `../src/index.ts` : les exemples
importent le moteur **par son nom de package**, exactement comme le fera un
utilisateur du package publié. Aucun `../../src` dans le code d'exemple.

## Démarrer

```bash
cp examples/.env.example examples/.env   # puis renseigner le token
npm run example:deploy                   # enregistre les slash commands
npm run example                          # lance le bot (rechargement à chaud)
```

Renseigne `DISCORD_GUILD_ID` avec ton serveur de test : les commandes de guilde
sont enregistrées instantanément, alors que les commandes globales mettent
jusqu'à une heure à se propager.

## `basic-bot/`

| Fichier                      | Rôle                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `index.ts`                   | Point d'entrée : construit le bot, gère l'arrêt propre            |
| `config.ts`                  | Lecture et validation des variables d'environnement               |
| `deploy-commands.ts`         | Enregistrement des slash commands auprès de l'API                 |
| `commands/ping.ts`           | Commande simple, avec `deferReply` et cooldown                    |
| `commands/echo.ts`           | Options string + boolean, réponse éphémère, mentions neutralisées |
| `events/guild-create.ts`     | Event qui redéploie les commandes sur une nouvelle guilde         |
| `events/guild-member-add.ts` | Event nécessitant un intent privilégié                            |
| `*.test.ts`                  | Tests unitaires des commandes, sans réseau                        |

## Contrat attendu du moteur

Les exemples sont écrits **contre l'API que `src/` doit exposer**. C'est
volontaire : ils servent de spécification exécutable. Voici la surface utilisée.

```ts
// src/index.ts doit exporter au minimum :

export function createBot(options: BotOptions): Bot;
export function defineCommand(command: CommandDefinition): CommandDefinition;
export function defineEvent<K extends keyof ClientEvents>(
  event: EventDefinition<K>,
): EventDefinition<K>;

export interface BotOptions {
  token: string;
  clientId: string;
  guildId?: string;
  intents: GatewayIntentBits[];
  commands?: CommandDefinition[];
  events?: EventDefinition<never>[];
  logger?: Logger;
}

export interface Bot {
  readonly client: Client;
  start(): Promise<void>;
  stop(): Promise<void>;
  deployCommands(target?: { guildId?: string }): Promise<void>;
}

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: Client<true>;
  logger: Logger;
  bot: Bot;
}

export interface CommandDefinition {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  /** Secondes entre deux usages par le même utilisateur. */
  cooldown?: number;
  execute(context: CommandContext): Promise<void> | void;
}

export interface EventContext {
  client: Client<true>;
  logger: Logger;
  bot: Bot;
}

export interface EventDefinition<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(context: EventContext, ...args: ClientEvents[K]): Promise<void> | void;
}

export interface Logger {
  fatal(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  trace(message: string, meta?: unknown): void;
  child(bindings: Record<string, unknown>): Logger;
}
```

Si tu pars sur une autre forme d'API, adapte les exemples et
`tests/helpers/run.ts` en conséquence — ce sont les deux seuls endroits qui
dépendent de cette surface.
