import path from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * E2E test fixtures for KaTab Chrome extension.
 *
 * Chrome extensions require a persistent browser context launched with
 * --load-extension. Playwright's built-in `context` fixture doesn't support
 * extensions, so we use our own `extContext` (worker-scoped).
 *
 * ` opens newtab.html with **clean storage** (isolated per test)newtabPage`
 * ` opens options.html with **clean storage** (isolated per test)optionsPage`
 */
import { type BrowserContext, type Page, test as base, chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3')

export type KaTabFixtures = {
  extContext: BrowserContext
  extId: string
  newtabPage: Page
  optionsPage: Page
}

export const test = base.extend<KaTabFixtures>({
  extContext: [
    async (
      // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
      {},
      use,
    ) => {
      const ctx = await chromium.launchPersistentContext('', {
        // Empty string → fresh temp profile per worker; workers are fully isolated.
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--headless=new',
        ],
      })
      await use(ctx)
      await ctx.close()
    },
    { scope: 'worker' },
  ],

  extId: [
    async ({ extContext }, use) => {
      let [background] = extContext.serviceWorkers()
      if (!background) {
        try {
          background = await extContext.waitForEvent('serviceworker', { timeout: 15_000 })
        } catch {
          throw new Error(
            'Failed to start extension service worker. Ensure Chromium channel is available and extension build exists at .output/chrome-mv3.',
          )
        }
      }
      const extId = background.url().split('/')[2]
      if (!extId) throw new Error('Failed to parse extension id from service worker URL.')
      await use(extId)
    },
    { scope: 'worker' },
  ],

  newtabPage: async ({ extContext, extId }, use) => {
    const page = await extContext.newPage()
    // Redirect chrome.storage.sync → chrome.storage.local to bypass the
    // 120-writes/min rate limit that causes failures when the full test suite
    // generates hundreds of sync writes. Tests don't need real cross-device
    // sync, so using local storage is equivalent for test purposes.
    await page.addInitScript(() => {
      Object.defineProperty(chrome.storage, 'sync', {
        get: () => chrome.storage.local,
        configurable: true,
      })
    })
    await page.goto(`chrome-extension://${extId}/newtab.html`)
    // Only need to clear local storage (sync is now aliased to local)
    await page.evaluate(async () => {
      await chrome.storage.local.clear()
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
    await page.close()
  },

  optionsPage: async ({ extContext, extId }, use) => {
    const page = await extContext.newPage()
    // Same sync→local redirect as newtabPage to avoid rate-limit issues
    await page.addInitScript(() => {
      Object.defineProperty(chrome.storage, 'sync', {
        get: () => chrome.storage.local,
        configurable: true,
      })
    })
    await page.goto(`chrome-extension://${extId}/options.html`)
    // Only need to clear local storage (sync is now aliased to local)
    await page.evaluate(async () => {
      await chrome.storage.local.clear()
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
