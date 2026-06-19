import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Import the shared contract/validation from the monorepo root.
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      // shared/ lives outside the frontend root and has no node_modules, so
      // point its bare `zod` import at the copy installed here.
      zod: fileURLToPath(new URL('./node_modules/zod', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Allow importing files from outside the frontend root (../shared).
    fs: { allow: ['..'] },
    // Proxy API calls to the backend so the frontend can use a relative /api.
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
