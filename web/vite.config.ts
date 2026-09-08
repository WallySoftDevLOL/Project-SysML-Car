import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
