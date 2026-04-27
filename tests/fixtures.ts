import { test as base, expect, chromium, Browser } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const fetch: any;

// Type definitions for window.app testing registry (synced with app/testing/registry.types.ts)
declare global {
  interface SignupPageApi {
    isReady(): boolean;
    inputEmail(email: string): void;
    inputPassword(password: string): void;
    inputConfirmPassword(password: string): void;
    isSubmitEnabled(): boolean;
    pressSubmit(): void;
    getValidationErrors(): Record<string, string>;
  }

  interface LoginPageApi {
    isReady(): boolean;
    inputEmail(email: string): void;
    inputPassword(password: string): void;
    isSubmitEnabled(): boolean;
    pressSubmit(): void;
    getGeneralError(): string | null;
  }

  interface WindowApp {
    signupPage?: SignupPageApi;
    loginPage?: LoginPageApi;
  }

  interface Window {
    app: WindowApp;
    _appRegistry?: Record<string, any>;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COCKROACH_PORT = 26500;
const APP_BASE_PORT = 3100; // Worker 0 → 3100, Worker 1 → 3101, etc.
const TEST_PASSWORD = 'TestPassword123!';

interface TestContext {
  appServerUrl: string;
  workerDatabaseName: string;
}

/**
 * Per-worker fixture setup:
 * 1. Create isolated database for this worker (test_worker_${workerIndex})
 * 2. Run migrations against that database
 * 3. Start app server on worker-specific port with DATABASE_URL pointing to worker database
 * 4. Wait for app server to be ready
 * 5. Sign up + login (populate auth state)
 * 6. Save storageState for subsequent tests
 */

async function setupWorkerDatabase(workerIndex: number): Promise<string> {
  const databaseName = `test_worker_${workerIndex}`;
  
  console.log(`[Worker ${workerIndex}] Creating database: ${databaseName}`);

  const adminClient = new pg.Client({
    connectionString: `postgresql://root@localhost:${COCKROACH_PORT}/defaultdb`,
  });

  try {
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`[Worker ${workerIndex}] ✓ Database created`);
  } finally {
    await adminClient.end();
  }

  return databaseName;
}

async function runMigrationsForWorker(
  workerIndex: number,
  databaseName: string
): Promise<void> {
  const databaseUrl = `postgresql://root@localhost:${COCKROACH_PORT}/${databaseName}`;
  
  console.log(`[Worker ${workerIndex}] Running migrations for ${databaseName}...`);

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  const result = spawnSync('pnpm', ['drizzle-kit', 'migrate'], {
    cwd: path.join(__dirname, '..', 'packages', 'database'),
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(
      `[Worker ${workerIndex}] Migrations failed with exit code ${result.status}`
    );
  }

  console.log(`[Worker ${workerIndex}] ✓ Migrations complete`);
}

async function startAppServer(
  workerIndex: number,
  databaseName: string
): Promise<{ url: string; kill: () => void }> {
  const port = APP_BASE_PORT + workerIndex;
  const databaseUrl = `postgresql://root@localhost:${COCKROACH_PORT}/${databaseName}`;

  const env = {
    ...process.env,
    PORT: port.toString(),
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'development',
  };

  console.log(
    `[Worker ${workerIndex}] Starting app server on port ${port} with database ${databaseName}...`
  );

  const appServer = spawn('pnpm', ['dev'], {
    cwd: path.join(__dirname, '..', 'apps', 'dashboard'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // Create a process group so we can kill it and all children
  });

  const url = `http://localhost:${port}`;

  // Capture output
  appServer.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[Worker ${workerIndex}] [AppServer] ${output.trim()}`);
  });

  appServer.stderr?.on('data', (data) => {
    console.error(`[Worker ${workerIndex}] [AppServer] ${data.toString().trim()}`);
  });

  const kill = () => {
    if (appServer.pid && !appServer.killed) {
      try {
        // Kill the entire process group (the negative PID)
        process.kill(-appServer.pid, 'SIGTERM');
      } catch (error) {
        console.warn(`[Worker ${workerIndex}] Could not kill process group: ${error}`);
      }
    }
  };

  // Wait for app server to be ready
  await waitForServer(url, 30000, workerIndex);
  console.log(`[Worker ${workerIndex}] ✓ App server ready at ${url}`);

  return { url, kill };
}

async function waitForServer(
  url: string,
  timeoutMs: number,
  workerIndex: number
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`${url}/`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok || response.status === 307) {
        // 307 is a redirect, which is fine
        return;
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `[Worker ${workerIndex}] Timed out waiting for app server at ${url}`
  );
}

/**
 * Helper to perform signup through the UI using window.app registry
 * Signup redirects directly to / which then redirects to /projects
 * No separate login step needed
 * Persists auth state for reuse by subsequent tests
 * 
 * VALIDATION TIMING GOTCHA: The signup form uses real-time onChange validation.
 * When we call inputEmail/inputPassword via window.app, the TanStack Form state
 * updates synchronously, but the form's canSubmit state may not reflect the change
 * immediately due to how React batches updates. We poll isSubmitEnabled() to wait
 * for the form to be valid before clicking submit.
 */
async function setupAuthState(
  page: any,
  baseUrl: string,
  workerIndex: number
): Promise<string> {
  const testEmail = `test-${Date.now()}@example.com`;

  console.log(`[Worker ${workerIndex}] [Auth] Signing up with ${testEmail}`);

  // Navigate to signup
  try {
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`[Worker ${workerIndex}] [Auth] Navigated to signup page`);
  } catch (e) {
    throw new Error(`[Auth] Failed to navigate to signup: ${e}`);
  }

  // Wait for signup page to be ready (with polling)
  let signupReady = false;
  let readyCheckAttempts = 0;
  const readyCheckStartTime = Date.now();
  const readyCheckTimeout = 20000;

  while (Date.now() - readyCheckStartTime < readyCheckTimeout && !signupReady) {
    try {
      const result = await page.evaluate(() => {
        if (typeof window.app === 'undefined') {
          return { ready: false, reason: 'window.app not defined' };
        }
        if (typeof window.app.signupPage === 'undefined') {
          return { ready: false, reason: 'window.app.signupPage not defined' };
        }
        if (typeof window.app.signupPage.isReady !== 'function') {
          return { ready: false, reason: 'window.app.signupPage.isReady not a function' };
        }
        try {
          const isReady = window.app.signupPage.isReady();
          return { ready: isReady, reason: isReady ? 'ready' : 'isReady() returned false' };
        } catch (e) {
          return { ready: false, reason: `isReady() threw: ${String(e)}` };
        }
      });
      
      readyCheckAttempts++;
      signupReady = result.ready;
      
      if (readyCheckAttempts % 5 === 0) {
        console.log(`[Worker ${workerIndex}] [Auth] Ready check ${readyCheckAttempts}: ${result.reason}`);
      }
      
      if (signupReady) {
        console.log(`[Worker ${workerIndex}] [Auth] Signup page ready after ${readyCheckAttempts} checks`);
        break;
      }
    } catch (e) {
      // Signup page not ready yet or evaluation error
      readyCheckAttempts++;
      if (readyCheckAttempts % 5 === 0) {
        console.log(`[Worker ${workerIndex}] [Auth] Ready check ${readyCheckAttempts} failed: ${String(e)}`);
      }
    }

    if (!signupReady) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (!signupReady) {
    const finalState = await page.evaluate(() => {
      return {
        hasWindow: typeof window !== 'undefined',
        hasApp: typeof window?.app !== 'undefined',
        appKeys: Object.keys(window?._appRegistry ?? {}),
      };
    }).catch(() => ({ error: 'could not evaluate' }));
    
    throw new Error(
      `[Auth] Signup page API not available after ${readyCheckAttempts} attempts and ${Date.now() - readyCheckStartTime}ms. Final state: ${JSON.stringify(finalState)}`
    );
  }

  console.log(`[Worker ${workerIndex}] [Auth] Signup page ready, filling form`);

  // Fill signup form using window.app API
  try {
    await page.evaluate((email: string) => {
      window.app.signupPage.inputEmail(email);
    }, testEmail);

    await page.evaluate((password: string) => {
      window.app.signupPage.inputPassword(password);
    }, TEST_PASSWORD);

    await page.evaluate((password: string) => {
      window.app.signupPage.inputConfirmPassword(password);
    }, TEST_PASSWORD);

    console.log(`[Worker ${workerIndex}] [Auth] Form filled via window.app`);
  } catch (e) {
    throw new Error(`[Auth] Failed to fill signup form: ${e}`);
  }

  // Wait for form to be valid (validation timing gotcha: validation is onChange, not on blur/submit)
  let isValid = false;
  const validationStartTime = Date.now();
  const validationTimeout = 5000;

  while (Date.now() - validationStartTime < validationTimeout) {
    isValid = await page.evaluate(() => {
      return window.app.signupPage?.isSubmitEnabled() ?? false;
    });

    if (isValid) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!isValid) {
    const errors = await page.evaluate(() => {
      return window.app.signupPage?.getValidationErrors() ?? {};
    });
    throw new Error(
      `[Auth] Form validation failed to pass within ${validationTimeout}ms. Errors: ${JSON.stringify(errors)}`
    );
  }

  console.log(`[Worker ${workerIndex}] [Auth] Form is valid, submitting`);

  // Submit
  try {
    await page.evaluate(() => {
      window.app.signupPage.pressSubmit();
    });
    console.log(`[Worker ${workerIndex}] [Auth] Submit clicked`);
  } catch (e) {
    throw new Error(`[Auth] Failed to click submit: ${e}`);
  }

  // Wait for redirect to /projects
  // Signup redirects to / which then redirects to /projects (via the root route loader)
  try {
    await page.waitForURL('**/projects', { timeout: 15000 });
    console.log(`[Worker ${workerIndex}] [Auth] Redirected to projects: ${page.url()}`);
  } catch (e) {
    console.log(`[Worker ${workerIndex}] [Auth] Redirect to projects timed out. Current URL: ${page.url()}`);
    throw e;
  }

  // Save storage state to file for reuse in subsequent tests
  const storageStateFile = path.join(__dirname, `.storage-state-worker-${workerIndex}.json`);
  await page.context().storageState({ path: storageStateFile });
  console.log(`[Worker ${workerIndex}] [Auth] ✓ Auth setup complete, storage state saved to ${storageStateFile}`);

  return storageStateFile;
}

// Cache to store per-worker setup (so multiple tests in a worker reuse the same setup)
const workerSetupCache = new Map<
  number,
  { appServerUrl: string; kill: () => void; storageStateFile: string }
>();

export const test = base.extend<TestContext>({
  appServerUrl: async ({}, use, testInfo) => {
    const workerIndex = testInfo.workerIndex;

    // Check if this worker already has setup
    if (!workerSetupCache.has(workerIndex)) {
      console.log(
        `[Worker ${workerIndex}] First test in worker, setting up infrastructure...`
      );

      let appServerKill: (() => void) | undefined;
      let storageStateFile: string | undefined;

      try {
        // 1. Create worker database
        const databaseName = await setupWorkerDatabase(workerIndex);

        // 2. Run migrations
        await runMigrationsForWorker(workerIndex, databaseName);

        // 3. Start app server
        const { url: appServerUrl, kill } = await startAppServer(
          workerIndex,
          databaseName
        );
        appServerKill = kill;

        // 4. Setup authentication (signup + persist session)
        const browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          storageStateFile = await setupAuthState(page, appServerUrl, workerIndex);
        } catch (error) {
          console.error(`[Worker ${workerIndex}] ✗ Auth setup failed:`, error);
          throw error;
        } finally {
          await context.close();
          await browser.close();
        }

        console.log(`[Worker ${workerIndex}] ✓ Worker infrastructure ready`);

        // Cache the setup for subsequent tests in this worker
        workerSetupCache.set(workerIndex, {
          appServerUrl,
          kill: appServerKill,
          storageStateFile: storageStateFile,
        });
      } catch (error) {
        console.error(`[Worker ${workerIndex}] ✗ Worker setup failed:`, error);
        if (appServerKill) {
          appServerKill();
        }
        throw error;
      }
    } else {
      console.log(`[Worker ${workerIndex}] Reusing existing infrastructure`);
    }

    const { appServerUrl } = workerSetupCache.get(workerIndex)!;
    await use(appServerUrl);
  },

  workerDatabaseName: async ({}, use, testInfo) => {
    const databaseName = `test_worker_${testInfo.workerIndex}`;
    await use(databaseName);
  },
});

// Use storageState from the cached setup for the worker
test.beforeEach(async ({ context }, testInfo) => {
  const workerIndex = testInfo.workerIndex;
  const cached = workerSetupCache.get(workerIndex);

  if (cached && cached.storageStateFile && fs.existsSync(cached.storageStateFile)) {
    console.log(
      `[Worker ${workerIndex}] Loading storage state from ${cached.storageStateFile}`
    );
    const storageState = JSON.parse(fs.readFileSync(cached.storageStateFile, 'utf-8'));
    await context.addCookies(storageState.cookies || []);
  }
});

// Cleanup when Playwright exits would happen automatically

export { expect };
