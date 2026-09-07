import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  // discord.js reste externe : c'est une peerDependency, jamais bundlée
  external: ['discord.js'],
});
