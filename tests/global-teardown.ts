import { spawnSync } from 'node:child_process';

const CONTAINER_NAME = 'secret-party-e2e-cockroachdb';

async function globalTeardown(): Promise<void> {
  console.log('🧹 Global teardown: cleaning up test infrastructure...');

  try {
    // Kill the CockroachDB container
    console.log('Stopping CockroachDB container...');
    const result = spawnSync('docker', ['rm', '-f', CONTAINER_NAME], {
      stdio: 'inherit',
    });

    if (result.status === 0) {
      console.log('✓ CockroachDB container stopped and removed');
    } else {
      console.warn('⚠ Could not remove CockroachDB container (may have already been stopped)');
    }
  } catch (error) {
    console.warn('⚠ Error during teardown:', error);
    // Non-fatal — teardown should not fail the test run
  }

  console.log('✓ Global teardown complete');
}

export default globalTeardown;
