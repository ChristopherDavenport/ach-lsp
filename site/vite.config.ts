import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/ach-lsp/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        '404': resolve(__dirname, '404.html'),
      },
    },
  },
});
