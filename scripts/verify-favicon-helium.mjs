/**
 * Closed-loop favicon verification using the user's Helium Chrome + deployed extension.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3')
const chromeExe =
  process.env.KATAB_CHROME ??
  'C:\\Users\\ligang\\AppData\\Local\\imput\\Helium\\Application\\chrome.exe'

function hashContentSync(value) {
  const str = JSON.stringify(value)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash >>>= 0
  }
  return hash.toString(16).padStart(8, '0')
}

function normalizeSiteUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    return `${parsed.origin}${pathname}${parsed.search}`
  } catch {
    return rawUrl.trim()
  }
}

async function main() {
  console.log('[verify] chrome:', chromeExe)
  console.log('[verify] extension:', extensionPath)

  const userDataDir = path.join(__dirname, '../.tmp/helium-verify-profile')
  fs.rmSync(userDataDir, { recursive: true, force: true })
  const collectionName = `Favicon E2E ${Date.now()}`
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: chromeExe,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  try {
    let [sw] = ctx.serviceWorkers()
    if (!sw) {
      sw = await ctx.waitForEvent('serviceworker', { timeout: 30_000 })
    }
    const extId = sw.url().split('/')[2]
    console.log('[verify] extension id:', extId)

    const page = await ctx.newPage()
    await page.goto(`chrome-extension://${extId}/newtab.html`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('.collections-panel')
        if (!panel) return false
        const text = panel.textContent ?? ''
        return (
          text.includes('No collections in this board') ||
          panel.querySelector('[data-collection-id]') !== null ||
          text.includes('Create Collection')
        )
      },
      { timeout: 15_000 },
    )
    const emptyBtn = page.getByRole('button', { name: 'Create Collection' }).first()
    if (await emptyBtn.isVisible()) {
      await emptyBtn.click()
    } else {
      await page
        .locator('.collections-panel')
        .getByRole('button', { name: 'Create Collection' })
        .click()
    }
    await page.getByText('New Collection').waitFor({ state: 'visible' })
    await page.getByPlaceholder(/e\.g\. Work/i).fill(collectionName)
    await page.getByRole('button', { name: /^Create$/ }).click()
    const card = page.locator('[data-collection-id]').filter({ hasText: collectionName })
    await card.waitFor({ state: 'visible', timeout: 12_000 })
    await card.getByRole('button', { name: '+ Add site' }).click()
    const siteUrl = 'https://example.com'
    await page.getByPlaceholder('https://platform.openai.com/docs').fill(siteUrl)
    await page.getByRole('button', { name: /^Add site$/ }).click()

    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const canonical = normalizeSiteUrl(siteUrl)
    const cacheKey = `local:katab:favicon-cache:${hashContentSync(canonical)}`

    await page.evaluate(
      async ({ cacheKey, dataUrl, canonical }) => {
        await chrome.storage.local.set({
          [cacheKey]: {
            siteUrl: canonical,
            dataUrl,
            fetchedAt: Date.now(),
            title: 'Example',
          },
          'local:katab:favicon-cache:index': [cacheKey],
        })
      },
      { cacheKey, dataUrl, canonical },
    )

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('.collections-panel')
        return panel?.querySelector('[data-collection-id]') !== null
      },
      { timeout: 15_000 },
    )
    const cardAfterReload = page.locator('[data-collection-id]').filter({ hasText: collectionName })
    await page.waitForFunction(
      async ({ cacheKey }) => {
        const row = await chrome.storage.local.get(cacheKey)
        return Boolean(row[cacheKey]?.dataUrl)
      },
      { cacheKey },
      { timeout: 10_000 },
    )
    await page.waitForFunction(
      () => document.querySelector('img[src^="data:image"]') !== null,
      { timeout: 20_000 },
    )
    const img = cardAfterReload.locator('img[src^="data:image"]')
    await img.waitFor({ state: 'visible', timeout: 5_000 })
    const src = await img.getAttribute('src')
    if (src !== dataUrl) {
      throw new Error(`Expected data URL favicon, got: ${src?.slice(0, 80)}`)
    }

    console.log('[verify] UI shows cached data-URL favicon — OK')

    await page.evaluate(async ({ canonical }) => {
      const hash = (() => {
        const str = JSON.stringify(canonical)
        let h = 5381
        for (let i = 0; i < str.length; i++) {
          h = ((h << 5) + h) ^ str.charCodeAt(i)
          h >>>= 0
        }
        return h.toString(16).padStart(8, '0')
      })()
      const key = `local:katab:favicon-cache:${hash}`
      const entry = await chrome.storage.local.get(key)
      if (!entry[key]?.dataUrl) throw new Error('cache entry missing after backfill path')
    }, { canonical })

    console.log('[verify] manual cache injection — OK')

  // Live SW backfill (no manual data URL injection)
  const liveName = `Favicon Live ${Date.now()}`
  await page.getByRole('button', { name: 'Create Collection' }).click()
  await page.getByText('New Collection').waitFor()
  await page.getByPlaceholder(/e\.g\. Work/i).fill(liveName)
  await page.getByRole('button', { name: /^Create$/ }).click()
  const liveCard = page.locator('[data-collection-id]').filter({ hasText: liveName })
  await liveCard.waitFor()
  await liveCard.getByRole('button', { name: '+ Add site' }).click()
  const liveSite = 'https://www.wikipedia.org'
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(liveSite)
  await page.getByRole('button', { name: /^Add site$/ }).click()
  await page.waitForTimeout(500)

  const liveCanonical = normalizeSiteUrl(liveSite)
  const liveKey = `local:katab:favicon-cache:${hashContentSync(liveCanonical)}`

  await page.waitForFunction(
    async ({ liveKey }) => {
      const row = await chrome.storage.local.get(liveKey)
      return typeof row[liveKey]?.dataUrl === 'string' && row[liveKey].dataUrl.startsWith('data:image')
    },
    { liveKey },
    { timeout: 90_000, polling: 2000 },
  )
  await page.waitForFunction(
    () => {
      const card = [...document.querySelectorAll('[data-collection-id]')].find((el) =>
        el.textContent?.includes('wikipedia.org'),
      )
      if (!card) return false
      const img = card.querySelector('img[src^="data:image"]')
      return img !== null
    },
    { timeout: 30_000, polling: 1000 },
  )
  console.log('[verify] service worker backfill — OK')
  console.log('[verify] ALL PASSED')
  } finally {
    await ctx.close()
  }
}

main().catch((err) => {
  console.error('[verify] FAILED', err)
  process.exit(1)
})