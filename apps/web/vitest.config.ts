import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const rootDir = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': rootDir,
      '@/components': resolve(rootDir, 'components'),
      '@/lib': resolve(rootDir, 'lib'),
      '@/types': resolve(rootDir, 'types')
    }
  }
});
