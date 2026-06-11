import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Config — SCADA Frontend
 *
 * ก่อนรัน:
 *   1. npm run dev          (ที่ scada-frontend/)
 *   2. npx playwright test  (ที่ root หรือ folder นี้)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,        // run sequentially (share login state)
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
})
