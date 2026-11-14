import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from './helpers'

function hashContentSync(value: unknown): string {
  const str = JSON.stringify(value)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash >>>= 0
  }
  return hash.toString(16).padStart(8, '0')
}

function normalizeSiteUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    return `${parsed.origin}${pathname}${parsed.search}`
  } catch {
    return rawUrl.trim()
  }
}

test.describe('Favicon backfill', () => {
  test('E2E-FC-01: cached data URL appears on collection site row', async ({
    newtabPage: page,
    extContext,
  }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Favicon Test')
    const siteUrl = 'https://example.com'

    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill(siteUrl)
    await page.getByRole('button', { name: /^Add site$/ }).click()
    await expect(page.getByText(/Add site to Favicon Test/i)).not.toBeVisible({ timeout: 10_000 })

    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const cacheKey = `local:katab:favicon-cache:${hashContentSync(normalizeSiteUrl(siteUrl))}`

    await page.evaluate(
      async ({ cacheKey, dataUrl, siteUrl }) => {
        await chrome.storage.local.set({
          [cacheKey]: {
            siteUrl,
            dataUrl,
            fetchedAt: Date.now(),
            title: 'Example',
          },
          'local:katab:favicon-cache:index': [cacheKey],
        })
      },
      { cacheKey, dataUrl, siteUrl: normalizeSiteUrl(siteUrl) },
    )

    await page.reload()
    await waitForBoardReady(page)

    const img = card.locator('img[src^="data:image"]')
    await expect(img).toBeVisible({ timeout: 15_000 })
    await expect(img).toHaveAttribute('src', dataUrl)

    expect(extContext.serviceWorkers().length).toBeGreaterThan(0)
  })

  test('E2E-FC-02: manual fetch all button is visible on top bar', async ({
    newtabPage: page,
  }) => {
    await waitForBoardReady(page)
    const btn = page.getByRole('button', { name: 'Get Icons' })
    await expect(btn).toBeVisible()
    await expect(btn).toBeEnabled()
  })
})