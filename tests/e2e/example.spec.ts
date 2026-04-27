import { test, expect } from '../fixtures';

/**
 * Example E2E Test
 * 
 * This demonstrates the test infrastructure.
 * The test fixture automatically:
 * - Creates an isolated database for this worker
 * - Runs migrations
 * - Starts an app server on a worker-specific port
 * - Signs up + logs in + saves authentication state
 * - Makes auth state available to all tests in that worker
 */

test('example: authenticated user lands on projects page', async ({ page, appServerUrl }) => {
  // Navigate to the app with authenticated session
  await page.goto(appServerUrl);
  
  // The user should be on the /projects page (not the login page)
  expect(page.url()).toContain('/projects');
  
  // Verify the page has loaded by checking for expected content
  // (Projects page displays a heading or projects list)
  const main = page.locator('main');
  await expect(main).toBeVisible();
});
