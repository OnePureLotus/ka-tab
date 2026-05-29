import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '.output/chrome-mv3')

// When running in CI with a specific Chrome version (via browser-actions/setup-chrome),
// CHROME_PATH points to that binary. Falls back to Playwright's bundled Chromium.
const executablePath = process.env.CHROME_PATH || undefined

const extensionLaunch = {
  executablePath,
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
  workers: 1, // extensions require serial execution (one persistent context)
  use: {
    browserName: 'chromium',
    launchOptions: extensionLaunch,
    // Uncomment to slow down actions for visual debugging:
    // slowMo: 500, // milliseconds delay between actions
  },
  projects: [
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 30_000,
      retries: 2, // chrome.storage.sync has a 120 write/min rate limit; retries handle transient queue overflows
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      timeout: 60_000, // multi-step flows need more time
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
