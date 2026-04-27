import { spawn, spawnSync } from 'node:child_process';
import pg from 'pg';

const COCKROACH_PORT = 26500;
const COCKROACH_IMAGE = 'cockroachdb/cockroach:latest-v25.1';
const CONTAINER_NAME = 'secret-party-e2e-cockroachdb';

interface GlobalSetupContext {
  cockroachDbPid?: number;
  containerStarted?: boolean;
}

const globalContext: GlobalSetupContext = {};

async function waitForCockroachDB(
  maxAttempts = 60,
  delayMs = 500
): Promise<void> {
  const connectionString = `postgresql://root@localhost:${COCKROACH_PORT}/defaultdb`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const client = new pg.Client({ connectionString });
      await client.connect();
      await client.end();
      console.log('✓ CockroachDB is ready');
      return;
    } catch (error) {
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(
    `Timed out waiting for CockroachDB on localhost:${COCKROACH_PORT} after ${maxAttempts * delayMs}ms`
  );
}

async function startCockroachDB(): Promise<void> {
  console.log(`Starting CockroachDB container on port ${COCKROACH_PORT}...`);

  // Check if container already exists and remove it
  try {
    spawnSync('docker', ['rm', '-f', CONTAINER_NAME], { stdio: 'ignore' });
  } catch {
    // Ignore errors if docker isn't available or container doesn't exist
  }

  return new Promise((resolve, reject) => {
    const docker = spawn(
      'docker',
      [
        'run',
        '--name',
        CONTAINER_NAME,
        '--rm',
        '-p',
        `${COCKROACH_PORT}:26257`,
        COCKROACH_IMAGE,
        'start-single-node',
        '--insecure',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], detached: true }
    );

    globalContext.cockroachDbPid = docker.pid;
    globalContext.containerStarted = true;

    // Capture output for debugging
    docker.stdout?.on('data', (data) => {
      console.log(`[CockroachDB] ${data.toString().trim()}`);
    });

    docker.stderr?.on('data', (data) => {
      console.error(`[CockroachDB] ${data.toString().trim()}`);
    });

    docker.on('error', (error) => {
      globalContext.containerStarted = false;
      reject(new Error(`Failed to start CockroachDB container: ${error.message}`));
    });

    docker.on('exit', (code) => {
      if (code !== null && code !== 0 && globalContext.containerStarted) {
        globalContext.containerStarted = false;
        reject(new Error(`CockroachDB container exited with code ${code}`));
      }
    });

    // Store kill function for later (though we use docker rm -f in teardown)
    (globalContext as any).killCockroachDB = () => {
      if (docker.pid && !docker.killed) {
        try {
          process.kill(-docker.pid, 'SIGTERM'); // Kill process group
        } catch {
          docker.kill('SIGTERM');
        }
      }
    };

    resolve();
  });
}

async function globalSetup(): Promise<void> {
  console.log('🚀 Global setup: starting test infrastructure...');

  try {
    await startCockroachDB();
    await waitForCockroachDB();
    
    console.log('✓ Global setup complete. Tests can now start.');
    
    // Keep the global context for teardown
    process.env.PLAYWRIGHT_GLOBAL_SETUP_CONTEXT = JSON.stringify(globalContext);
  } catch (error) {
    console.error('✗ Global setup failed:', error);
    if ((globalContext as any).killCockroachDB) {
      (globalContext as any).killCockroachDB();
    }
    process.exit(1);
  }
}

export default globalSetup;
