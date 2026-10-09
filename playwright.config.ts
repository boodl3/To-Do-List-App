import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:1420', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'light',
      testIgnore: /perf\.spec/,
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'dark',
      testIgnore: /perf\.spec/,
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    // Frame timing needs an idle machine: run alone, after everything else.
    {
      name: 'perf',
      testMatch: /perf\.spec/,
      dependencies: ['light', 'dark'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
