// Dans un vrai bot : import { Otterbots } from 're-otterbots';
import { Otterbots } from '../src';

// Tout se règle dans le .env (voir .env.example) : token, configuration, interface web, API
new Otterbots().run().catch((error: unknown) => {
	console.error('Le bot a planté :', error);
	process.exit(1);
});
