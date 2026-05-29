import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from './helpers'

/** Helper: add a site to a collection card via the "Add site" dialog. */
async function addSiteToCard(page: import('@playwright/test').Page, card: import('@playwright/test').Locator, url: string) {
  await card.getByRole('button', { name: /add site/i }).click()
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(url)
  await page.getByRole('button', { name: /^Add site$/ }).click()
  // Wait for dialog to close
  await expect(page.getByText(/Add site to/i)).not.toBeVisible({ timeout: 5_000 })
}

test.describe('Collection "Open All" Functionality', () => {
  test('E2E-CO-01: clicking "Open all" opens all collection sites in new tabs', async ({ newtabPage: page, extContext }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'OpenAll')

    await addSiteToCard(page, card, 'https://example.com')
    await addSiteToCard(page, card, 'https://github.com')

    // Our newtabPage fixture redirects chrome.storage.sync → chrome.storage.local.
    // WXT strips the area prefix and stores keys as `katab:*` in the actual storage area.
    // The background service worker reads from the *real* chrome.storage.sync, so we
    // must mirror the `katab:*` keys from local to real sync.
    const localData = await page.evaluate(async () => {
      const all = await new Promise<Record<string, unknown>>(resolve =>
        chrome.storage.local.get(null, resolve),
      )
      // WXT stores keys as `katab:*` (area prefix stripped)
      return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('katab:')))
    })
    const [sw] = extContext.serviceWorkers()
    await sw.evaluate(async (data: Record<string, unknown>) => {
      await new Promise<void>(resolve => chrome.storage.sync.set(data, resolve))
    }, localData)

    // Register page-creation listeners BEFORE clicking so we don't miss fast opens
    const page1Promise = extContext.waitForEvent('page', { timeout: 10_000 })
    const page2Promise = extContext.waitForEvent('page', { timeout: 10_000 })

    await card.getByRole('button', { name: /open all/i }).click()

    const [p1, p2] = await Promise.all([page1Promise, page2Promise])
    expect(p1).toBeTruthy()
    expect(p2).toBeTruthy()

    await p1.close().catch(() => {})
    await p2.close().catch(() => {})
  })

  test('E2E-CO-02: "Open all" respects openCollectionMode new-window setting', async ({ newtabPage: page, extContext }) => {
    await waitForBoardReady(page)

    // Write openCollectionMode:'new-window' directly into local storage (our redirect
    // means this is what the newtab page reads as chrome.storage.sync).
    // WXT strips the area prefix, so the key in local is `katab:settings`.
    await page.evaluate(async () => {
      await new Promise<void>(resolve =>
        chrome.storage.local.set(
          {
            'katab:settings': {
              theme: 'system',
              accentColor: '#6366f1',
              blockedDomains: [],
              openCollectionMode: 'new-window',
              colorPalette: [
                { id: 'indigo', name: 'Indigo', color: '#4f46e5', tabGroupColor: 'blue' },
                { id: 'green', name: 'Green', color: '#059669', tabGroupColor: 'green' },
                { id: 'blue', name: 'Blue', color: '#2563eb', tabGroupColor: 'blue' },
                { id: 'pink', name: 'Pink', color: '#db2777', tabGroupColor: 'pink' },
                { id: 'orange', name: 'Orange', color: '#f97316', tabGroupColor: 'orange' },
                { id: 'teal', name: 'Teal', color: '#0f766e', tabGroupColor: 'cyan' },
              ],
            },
          },
          resolve,
        ),
      )
    })
    // Reload so the app picks up the new setting
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const card = await createCollectionViaUI(page, 'NewWin')
    await addSiteToCard(page, card, 'https://example.com')

    // Copy collection data to real sync for the background service worker
    const localData = await page.evaluate(async () => {
      const all = await new Promise<Record<string, unknown>>(resolve =>
        chrome.storage.local.get(null, resolve),
      )
      // WXT stores keys as `katab:*` (area prefix stripped)
      return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('katab:')))
    })
    const [sw] = extContext.serviceWorkers()
    await sw.evaluate(async (data: Record<string, unknown>) => {
      await new Promise<void>(resolve => chrome.storage.sync.set(data, resolve))
    }, localData)

    // In new-window mode the background calls chrome.windows.create() which
    // results in a new page in the persistent context.
    const newWindowPagePromise = extContext.waitForEvent('page', { timeout: 10_000 })
    await card.getByRole('button', { name: /open all/i }).click()
    const newWindowPage = await newWindowPagePromise
    expect(newWindowPage).toBeTruthy()
    await newWindowPage.close().catch(() => {})
  })

  test('E2E-CO-03: empty collection keeps "Open all" button disabled', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Empty')
    
    const openAllButton = card.getByRole('button', { name: /open all/i })
    await expect(openAllButton).toBeDisabled()
  })

  test('E2E-CO-04: "Open all" button enables immediately after adding first site', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    const openAllButton = card.getByRole('button', { name: /open all/i })
    
    await expect(openAllButton).toBeDisabled()
    
    await card.getByRole('button', { name: /add site/i }).click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://example.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    await page.waitForTimeout(300)
    
    await expect(openAllButton).toBeEnabled()
  })
})

