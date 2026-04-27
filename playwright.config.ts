import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E Test Configuration for Secret Party
 * 
 * Architecture:
 * - Global setup: starts single CockroachDB container on port 26500
 * - Per-worker: creates isolated database, runs migrations, starts app server on unique port
 * - Per-worker fixtures: handles signup+login, saves auth state for all tests in that worker
 * - Global teardown: kills CockroachDB container
 */

export default defineConfig({
  testDir: path.join(__dirname, 'tests/e2e'),
  
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Test timeout */
  timeout: 60000, // 60 seconds per test (includes auth setup time)

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests.
   * Tests will start after the global setup hook completes. */
  globalSetup: path.resolve(__dirname, './tests/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './tests/global-teardown.ts'),
});
