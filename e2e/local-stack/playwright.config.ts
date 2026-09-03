import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Full-stack browser checks that need a seeded database and a running API.
 * Kept out of the default `npm run test:e2e` run (see testIgnore in the root
 * config) because they cannot pass without the local stack from README.md.
 */
export default defineConfig({
  testDir: here,
  timeout: 60000,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3011', headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: 'line',
});
