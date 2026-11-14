/**
 * Closed-loop: import user backup JSON → backfill → persistence across new tabs.
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

const backupPath =
  process.argv[2] ??
  'C:\\Users\\ligang\\.cursor\\projects\\c-Users-ligang-Develpoment-ka-tab-main\\attachments\\1f613881-00d3-49e3-9a45-24e3d3da6524\\katab-sync-2026-11-14.json'

if (!fs.existsSync(backupPath)) {
  console.error('[backup-verify] missing file:', backupPath)
  process.exit(1)
}

const userDataDir = path.join(__dirname, '../.tmp/helium-backup-verify')
fs.rmSync(userDataDir, { recursive: true, force: true })

async function readCacheStats(page) {
  return page.evaluate(async () => {
    const indexBare = 'katab:favicon-cache:index'
    const indexLegacy = 'local:katab:favicon-cache:index'
    const indexRow = await chrome.storage.local.get([indexBare, indexLegacy])
    const index = indexRow[indexBare] ?? indexRow[indexLegacy] ?? []
    const keys = [indexBare, ...index.map((k) => (k.startsWith('local:') ? k.slice(6) : k))]
    const bytes = keys.length ? await chrome.storage.local.getBytesInUse(keys) : 0
    const imgs = [...document.querySelectorAll('img[src^="data:image"]')].length
    return { count: index.length, bytes, dataImgCount: imgs }
  })
}

async function main() {
  console.log('[backup-verify] backup:', backupPath)
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: chromeExe,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  })

  try {
    let [sw] = ctx.serviceWorkers()
    if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 30_000 })
    const extId = sw.url().split('/')[2]

    const options = await ctx.newPage()
    await options.goto(`chrome-extension://${extId}/options.html`)
    await options.waitForLoadState('domcontentloaded')

    await options.getByRole('button', { name: 'Sync' }).click()
    options.once('dialog', (dialog) => dialog.accept())
    const [fileChooser] = await Promise.all([
      options.waitForEvent('filechooser'),
      options.getByRole('button', { name: 'Import from file' }).click(),
    ])
    await fileChooser.setFiles(backupPath)
    await options.getByText(/Import completed/i).waitFor({ timeout: 120_000 })
    console.log('[backup-verify] backup imported')

    const page1 = await ctx.newPage()
    await page1.goto(`chrome-extension://${extId}/newtab.html`)
    await page1.waitForFunction(
      () => document.querySelector('.collections-panel [data-collection-id]') !== null,
      { timeout: 60_000 },
    )

    const targetCached = 5
    const deadline = Date.now() + 180_000
    let last = await readCacheStats(page1)
    console.log('[backup-verify] initial cache', last)

    while (Date.now() < deadline && last.count < targetCached) {
      await page1.waitForTimeout(5000)
      await page1.reload({ waitUntil: 'domcontentloaded' })
      await page1.waitForFunction(
        () => document.querySelector('.collections-panel [data-collection-id]') !== null,
        { timeout: 60_000 },
      )
      const next = await readCacheStats(page1)
      if (next.count > last.count) {
        console.log('[backup-verify] cache grew', next)
        last = next
      }
    }

    if (last.count < 1) {
      throw new Error(`Expected >=1 cached favicon after 3min, got ${last.count}`)
    }

    const page2 = await ctx.newPage()
    await page2.goto(`chrome-extension://${extId}/newtab.html`)
    await page2.waitForFunction(
      () => document.querySelector('.collections-panel [data-collection-id]') !== null,
      { timeout: 60_000 },
    )
    await page2.waitForTimeout(2000)
    const tab2 = await readCacheStats(page2)

    console.log('[backup-verify] second newtab cache', tab2)

    if (tab2.count < last.count) {
      throw new Error(`Persistence failed: tab1 count=${last.count} tab2=${tab2.count}`)
    }
    if (tab2.dataImgCount < 1) {
      throw new Error(`Second tab shows no data:image favicons (count=${tab2.dataImgCount})`)
    }

    console.log('[backup-verify] ALL PASSED', { tab1: last, tab2 })
  } finally {
    await ctx.close()
  }
}

main().catch((err) => {
  console.error('[backup-verify] FAILED', err)
  process.exit(1)
})