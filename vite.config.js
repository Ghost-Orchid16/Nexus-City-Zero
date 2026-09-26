import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the production build runs from any folder or static host.
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        // Keep the engine in its own long-lived chunk so game-code rebuilds stay small.
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }] }
      }
    }
  }
});
