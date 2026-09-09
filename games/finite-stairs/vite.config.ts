import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/finite-stairs/',
  plugins: [react()],
  build: {
    outDir: '../../finite-stairs',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
