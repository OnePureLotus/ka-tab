import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3')
const chromeExe =
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

const userDataDir = path.join(__dirname, '../.tmp/helium-debug-profile')
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

let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 30_000 })
const extId = sw.url().split('/')[2]
const page = await ctx.newPage()
await page.goto(`chrome-extension://${extId}/newtab.html`)
await page.waitForTimeout(2000)
await page.getByRole('button', { name: 'Create Collection' }).first().click()
await page.getByText('New Collection').waitFor()
await page.getByPlaceholder(/e\.g\. Work/i).fill('Dbg')
await page.getByRole('button', { name: /^Create$/ }).click()
const card = page.locator('[data-collection-id]').filter({ hasText: 'Dbg' })
await card.waitFor()
await card.getByRole('button', { name: '+ Add site' }).click()
const siteUrl = 'https://example.com'
await page.getByPlaceholder('https://platform.openai.com/docs').fill(siteUrl)
await page.getByRole('button', { name: /^Add site$/ }).click()
await page.waitForTimeout(1000)

const siteUrl2 = siteUrl
const canonical = siteUrl2
const cacheKey = `local:katab:favicon-cache:${hashContentSync(canonical)}`
const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

await page.evaluate(
  async ({ cacheKey, dataUrl, canonical }) => {
    await chrome.storage.local.set({
      [cacheKey]: { siteUrl: canonical, dataUrl, fetchedAt: Date.now() },
      'local:katab:favicon-cache:index': [cacheKey],
    })
  },
  { cacheKey, dataUrl, canonical },
)

await page.reload()
await page.waitForTimeout(5000)

const diag = await page.evaluate(async ({ cacheKey }) => {
  const all = await chrome.storage.local.get(null)
  const imgs = [...document.querySelectorAll('img')].map((i) => i.src.slice(0, 120))
  return {
    cacheKeys: Object.keys(all).filter((k) => k.includes('favicon')),
    cacheEntry: all[cacheKey],
    imgs,
    siteText: document.body.innerText.includes('example.com'),
  }
}, { cacheKey })

console.log(JSON.stringify(diag, null, 2))
await ctx.close()