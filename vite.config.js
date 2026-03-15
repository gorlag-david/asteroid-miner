import { defineConfig } from 'vite';

export default defineConfig({
  base: '/asteroid-miner/',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
