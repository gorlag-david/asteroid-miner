import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/asteroid-miner/',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trailer: resolve(__dirname, 'trailer.html'),
      },
    },
  },
});
