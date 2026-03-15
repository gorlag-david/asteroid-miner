import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lazygamedev/',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
