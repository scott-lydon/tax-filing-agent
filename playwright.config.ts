import { defineConfig } from '@playwright/test';

// Against a deployed URL: set E2E_BASE_URL and no local server is started.
// Locally: Playwright starts the production server on port 8799 (8787 is the default;
// the Factory app squats 8787 on this machine, so the e2e uses a separate port).
const liveUrl = process.env.E2E_BASE_URL;
const localPort = process.env.E2E_PORT ?? '8799';
const baseURL = liveUrl ?? `http://localhost:${localPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 40_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    acceptDownloads: true,
    video: process.env.RECORD ? 'on' : 'off',
    viewport: { width: 900, height: 800 },
  },
  webServer: liveUrl
    ? undefined
    : {
        command: `PORT=${localPort} npm start`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
