# Tests

Vitest, sans variables globales : `describe` / `it` / `expect` s'importent
explicitement depuis `vitest`.

```bash
npm test              # une passe
npm run test:watch    # mode watch
npm run test:coverage # couverture + seuils
```

## Emplacement des fichiers

| Motif                   | Usage                                                     |
| ----------------------- | --------------------------------------------------------- |
| `src/**/*.test.ts`      | Tests unitaires collés au code du moteur                  |
| `tests/**/*.test.ts`    | Tests d'intégration transverses                           |
| `examples/**/*.test.ts` | Tests des commandes d'exemple (démonstration des helpers) |

## Helpers

Tout est exposé par `#test/helpers/index.js` :

```ts
import { runCommand, runEvent, createMockClient, createMockLogger } from '#test/helpers/index.js';
```

| Helper                                 | Rôle                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `runCommand(command, init)`            | Exécute une commande avec un contexte factice, rend `{ interaction, logger, bot }` |
| `runEvent(event, ...args)`             | Idem pour un handler d'event, rend `{ logger, bot }`                               |
| `createMockChatInputInteraction(init)` | Interaction de slash command ; `reply` / `deferReply` / `editReply` sont des mocks |
| `createMockClient(init)`               | Client discord.js factice (`ws.ping`, `user`, …)                                   |
| `createMockBot()`                      | Bot factice (`start` / `stop` / `deployCommands`)                                  |
| `createMockLogger()`                   | Logger silencieux et inspectable                                                   |

### Exemple

```ts
import { describe, expect, it } from 'vitest';
import { runCommand } from '#test/helpers/index.js';
import { echo } from '../examples/basic-bot/commands/echo.js';

describe('/echo', () => {
  it('répète le message', async () => {
    const { interaction } = await runCommand(echo, { options: { message: 'salut' } });

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'salut' }));
  });
});
```

`init.options` alimente `interaction.options.getString/getBoolean/…`. Une option
demandée en `required` mais absente lève, comme le fait discord.js en vrai.

## Garde-fous

- `tests/setup.ts` remplace `fetch` par un mock qui **jette** : un test qui tente
  un appel réseau échoue au lieu de taper l'API Discord.
- `clearMocks` et `restoreMocks` sont actifs : pas de fuite d'état entre tests.
- Seuils de couverture : 80 % lignes / fonctions / instructions, 75 % branches,
  mesurés sur `src/` uniquement. À ajuster dans `vitest.config.ts` si tu les
  trouves trop stricts au démarrage.
