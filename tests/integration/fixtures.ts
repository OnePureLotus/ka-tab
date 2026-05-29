/**
 * Playwright fixtures for KaTab integration tests.
 *
 * Differences from e2e/fixtures.ts:
 *  - Storage is cleared ONCE at the start of each test (not on every page open).
 *  - `newtabPage` / `optionsPage` can be opened multiple times within one test
 *    and share the same storage state — enabling multi-step flow testing.
 *  - `freshPage` is a helper that clears storage then opens newtab (test entry point).
 *  - `openOptionsPage` is a helper that opens options WITHOUT clearing storage.
 */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3')

export type IntegrationFixtures = {
  extContext: BrowserContext
  extId: string
  /** Opens newtab.html with cleared storage — use as the entry point of each test. */
  freshPage: Page
  /** Opens options.html WITHOUT clearing storage — carries over state from freshPage. */
  openOptions: () => Promise<Page>
  /** Opens a second newtab.html WITHOUT clearing storage. */
  openNewtab: () => Promise<Page>
}

export const test = base.extend<IntegrationFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
  extContext: [async ({}, use) => {
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
  }, { scope: 'worker' }],

  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
  extId: [async ({ extContext }, use) => {
    let [background] = extContext.serviceWorkers()
    if (!background) {
      try {
        background = await extContext.waitForEvent('serviceworker', { timeout: 15_000 })
      } catch {
        throw new Error('Failed to start extension service worker. Ensure Chromium channel is available and extension build exists at .output/chrome-mv3.')
      }
    }
    const extId = background.url().split('/')[2]
    if (!extId) throw new Error('Failed to parse extension id from service worker URL.')
    await use(extId)
  }, { scope: 'worker' }],

  freshPage: async ({ extContext, extId }, use) => {
    const page = await extContext.newPage()
    await page.goto(`chrome-extension://${extId}/newtab.html`)
    // Clear storage ONCE — state persists for the lifetime of this test
    await page.evaluate(async () => {
      await chrome.storage.sync.clear()
      await chrome.storage.local.clear()
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
    await page.close()
  },

  openOptions: async ({ extContext, extId }, use) => {
    await use(async () => {
      const page = await extContext.newPage()
      await page.goto(`chrome-extension://${extId}/options.html`)
      await page.waitForLoadState('domcontentloaded')
      return page
    })
  },

  openNewtab: async ({ extContext, extId }, use) => {
    await use(async () => {
      const page = await extContext.newPage()
      await page.goto(`chrome-extension://${extId}/newtab.html`)
      await page.waitForLoadState('domcontentloaded')
      return page
    })
  },
})

export { expect } from '@playwright/test'
