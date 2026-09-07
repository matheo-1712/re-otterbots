// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Imports de types explicites (cohérent avec verbatimModuleSyntax)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Les handlers discord.js sont souvent async sans await : on autorise
      '@typescript-eslint/require-await': 'off',
      // Les listeners `client.on('x', async () => {})` renvoient des promesses
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // Tests & helpers : les mocks sont `any` par nature, les règles unsafe n'ont pas de sens.
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `expect(interaction.reply)` passe une méthode non liée : c'est voulu.
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
    },
  },

  // Exemples : ce sont des démos, `console` y est légitime.
  {
    files: ['examples/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Fichiers de config à la racine : pas de type-checking
  {
    files: ['*.config.{ts,mjs,js}', 'eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Toujours en dernier : désactive tout ce qui entre en conflit avec Prettier
  prettier,
);
