import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Music Practice Companion web build.
 *
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Your test files live in ./tests and end with `.spec.ts`.
 * `baseURL` lets you write `page.goto('/')` instead of the full URL.
 */
export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel.
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel workers on CI.
  workers: process.env.CI ? 1 : undefined,

  // After a run, open the HTML report with: npm run test:report
  reporter: 'html',

  use: {
    // So you can navigate with relative paths like page.goto('/').
    baseURL: 'http://localhost:8081',

    // Record a trace on the first retry of a failing test so you can debug it
    // in the Trace Viewer. (Run with `--trace on` to always capture one.)
    trace: 'on-first-retry',

    // Save a screenshot only when a test fails.
    screenshot: 'only-on-failure',
  },

  projects: [
    // Start with just Chromium while you learn. Uncomment the others later to
    // run the same tests across browsers.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  /**
   * Auto-start the app before tests and reuse it if it's already running.
   * This means you can either:
   *   (a) leave `npm run web` running in another terminal, OR
   *   (b) just run the tests and Playwright will start the server for you.
   */
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120_000, // Expo's first bundle can take a while.
  },
});
