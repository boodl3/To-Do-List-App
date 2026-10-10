import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    env: { TZ: 'UTC' },
    projects: [
      {
        extends: true,
        test: { name: 'logic', environment: 'node', include: ['src/{domain,state}/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.{ts,tsx}'],
          setupFiles: ['src/ui/test-setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      exclude: ['**/*.test.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
