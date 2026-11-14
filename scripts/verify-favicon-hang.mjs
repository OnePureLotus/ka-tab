/**
 * Long-running hang test: import backup, keep newtab open ~8 min, log SW + cache progress.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath =
  process.env.KATAB_EXT_PATH ??
  'C:\\Users\\ligang\\Application\\ka-tab-0.0.1-chrome'
const chromeExe =
  process.env.KATAB_CHROME ??
  'C:\\Users\\ligang\\AppData\\Local\\imput\\Helium\\Application\\chrome.exe'

const backupPath =
  process.argv[2] ??
  'C:\\Users\\ligang\\.cursor\\projects\\c-Users-ligang-Develpoment-ka-tab-main\\attachments\\1f613881-00d3-49e3-9a45-24e3d3da6524\\katab-sync-2026-11-14.json'

const HANG_MS = Number(process.env.HANG_MS ?? 8 * 60_000)
const POLL_MS = 20_000

function countUniqueSites(backup) {
  const seen = new Set()
  for (const col of backup.collections ?? []) {
    for (const site of col.sites ?? []) {
      try {
        const u = new URL(site.url)
        let p = u.pathname
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
        seen.add(`${u.origin}${p}${u.search}`)
      } catch {
        seen.add(site.url.trim())
      }
    }
  }
  return seen.size
}

async function readCacheStats(page) {
  return page.evaluate(async () => {
    const indexBare = 'katab:favicon-cache:index'
    const indexLegacy = 'local:katab:favicon-cache:index'
    const indexRow = await chrome.storage.local.get([indexBare, indexLegacy])
    const index = indexRow[indexBare] ?? indexRow[indexLegacy] ?? []
    const keys = [indexBare, ...index.map((k) => (k.startsWith('local:') ? k.slice(6) : k))]
    const bytes = keys.length ? await chrome.storage.local.getBytesInUse(keys) : 0
    const dataImgs = [...document.querySelectorAll('img[src^="data:image"]')].length
    return { count: index.length, bytes, dataImgs }
  })
}

function ts() {
  return new Date().toISOString().slice(11, 19)
}

async function main() {
  if (!fs.existsSync(extensionPath)) {
    throw new Error(`Extension path missing: ${extensionPath}`)
  }
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup missing: ${backupPath}`)
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  const siteTotal = countUniqueSites(backup)
  console.log(`[hang] ext=${extensionPath}`)
  console.log(`[hang] sites in backup (unique URLs)=${siteTotal}, hang=${HANG_MS / 1000}s`)

  const userDataDir = path.join(__dirname, '../.tmp/helium-hang-profile')
  fs.rmSync(userDataDir, { recursive: true, force: true })

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: chromeExe,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  })

  const swLogs = []
  const attachSw = (sw) => {
    sw.on('console', (msg) => {
      const line = msg.text()
      if (line.includes('[KaTab Favicon]')) {
        const out = `${ts()} [SW] ${line}`
        console.log(out)
        swLogs.push(out)
      }
    })
  }

  try {
    let [sw] = ctx.serviceWorkers()
    if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 60_000 })
    attachSw(sw)
    ctx.on('serviceworker', attachSw)

    const extId = sw.url().split('/')[2]
    const options = await ctx.newPage()
    await options.goto(`chrome-extension://${extId}/options.html`)
    await options.getByRole('button', { name: 'Sync' }).click()
    options.once('dialog', (d) => d.accept())
    const [fileChooser] = await Promise.all([
      options.waitForEvent('filechooser'),
      options.getByRole('button', { name: 'Import from file' }).click(),
    ])
    await fileChooser.setFiles(backupPath)
    await options.getByText(/Import completed/i).waitFor({ timeout: 120_000 })
    console.log(`[hang] ${ts()} import done`)

    const page = await ctx.newPage()
    await page.goto(`chrome-extension://${extId}/newtab.html`)
    await page.waitForFunction(
      () => document.querySelector('.collections-panel [data-collection-id]') !== null,
      { timeout: 120_000 },
    )

    let lastCount = -1
    let plateauSince = Date.now()
    const endAt = Date.now() + HANG_MS

    while (Date.now() < endAt) {
      const stats = await readCacheStats(page)
      const pct = siteTotal ? ((stats.count / siteTotal) * 100).toFixed(1) : 'n/a'
      console.log(
        `[hang] ${ts()} cache=${stats.count}/${siteTotal} (${pct}%) bytes=${stats.bytes} dataImgs=${stats.dataImgs}`,
      )

      if (stats.count > lastCount) {
        lastCount = stats.count
        plateauSince = Date.now()
      } else if (Date.now() - plateauSince > 120_000 && stats.count >= siteTotal * 0.5) {
        console.log(`[hang] ${ts()} plateau 2min with >=50% — ending early`)
        break
      }

      await page.waitForTimeout(POLL_MS)
    }

    const afterHang = await readCacheStats(page)
    const freshTab = await ctx.newPage()
    await freshTab.goto(`chrome-extension://${extId}/newtab.html`)
    await freshTab.waitForFunction(
      () => document.querySelector('.collections-panel [data-collection-id]') !== null,
      { timeout: 120_000 },
    )
    await freshTab.waitForTimeout(3000)
    const freshStats = await readCacheStats(freshTab)

    const report = {
      siteTotal,
      afterHang,
      freshTab: freshStats,
      swLogLines: swLogs.length,
      passed:
        afterHang.count >= Math.min(siteTotal, 40) &&
        freshStats.count >= afterHang.count &&
        freshStats.dataImgs > 0,
    }

    console.log(`[hang] ${ts()} REPORT`, JSON.stringify(report, null, 2))

    if (!report.passed) {
      console.error(`[hang] FAILED criteria — see report (need cache>=40 and persistence)`)
      if (swLogs.length === 0) {
        console.error('[hang] no SW favicon logs captured — worker may not be running this build')
      }
      process.exit(1)
    }
    console.log(`[hang] ALL PASSED after full hang`)
  } finally {
    await ctx.close()
  }
}

main().catch((err) => {
  console.error('[hang] CRASH', err)
  process.exit(1)
})