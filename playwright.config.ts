import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '.output/chrome-mv3')

const extensionLaunch = {
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--headless=new', // Chrome 112+ native headless; required for extension support in CI
  ],
  headless: false, // Let Chrome manage headless via --headless=new above
}

export default defineConfig({
  retries: 0,
  // Each worker launches its own Chrome instance with its own temp profile (launchPersistentContext('')).
  // Workers are fully isolated — parallel execution is safe.
  // CI (GitHub Actions ubuntu-latest) has 2 vCPUs → 2 workers. Locally Playwright picks half the CPU count.
  workers: process.env.CI ? 2 : undefined,
  use: {
    browserName: 'chromium',
    launchOptions: extensionLaunch,
  },
  projects: [
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 30_000,
      retries: 1,
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      timeout: 60_000,
    },
    {
      name: 'screenshots',
      testDir: './tests/screenshots',
      timeout: 90_000,
      retries: 0,
    },
  ],
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
})
