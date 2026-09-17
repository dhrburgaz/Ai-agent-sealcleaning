import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // 60s: the smoke test visits ~15 dashboard routes in one run, and against
  // `next dev` (not a production build) each route pays a first-compile
  // cost the first time it's hit — comfortably survivable at 30s normally,
  // but not with margin to spare on a slower/shared CI runner.
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
