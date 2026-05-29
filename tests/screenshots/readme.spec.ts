import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page, chromium, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const extensionPath = path.resolve(repoRoot, '.output/chrome-mv3')
const screenshotsDir = path.resolve(repoRoot, 'docs/screenshots')

type Site = {
  id: string
  url: string
  title: string
  favicon: string
  addedAt: number
}

type Collection = {
  id: string
  name: string
  color: string
  tabGroupColor: string
  sites: Site[]
  createdAt: number
  updatedAt: number
  hash: string
}

type Note = {
  id: string
  content: string
  sourceUrl?: string
  sourceDomain?: string
  createdAt: number
  updatedAt: number
  hash: string
}

const now = new Date('2026-05-29T12:00:00.000Z').getTime()

function favicon(url: string) {
  return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
}

function site(id: string, title: string, url: string): Site {
  return {
    id,
    title,
    url,
    favicon: favicon(url),
    addedAt: now,
  }
}

const collections: Collection[] = [
  {
    id: 'collection-daily',
    name: 'Daily essentials',
    color: '#4f46e5',
    tabGroupColor: 'blue',
    sites: [
      site('site-youtube', 'YouTube', 'https://www.youtube.com/'),
      site('site-wikipedia', 'Wikipedia', 'https://www.wikipedia.org/'),
      site('site-gmail', 'Gmail', 'https://mail.google.com/'),
      site('site-maps', 'Google Maps', 'https://maps.google.com/'),
      site('site-news', 'BBC News', 'https://www.bbc.com/news'),
      site('site-reddit', 'Reddit', 'https://www.reddit.com/'),
    ],
    createdAt: now,
    updatedAt: now,
    hash: 'screenshot-daily',
  },
  {
    id: 'collection-build',
    name: 'Build & ship',
    color: '#059669',
    tabGroupColor: 'green',
    sites: [
      site('site-github', 'GitHub', 'https://github.com/'),
      site('site-stackoverflow', 'Stack Overflow', 'https://stackoverflow.com/'),
      site('site-mdn', 'MDN Web Docs', 'https://developer.mozilla.org/'),
      site('site-playwright', 'Playwright', 'https://playwright.dev/'),
    ],
    createdAt: now + 1,
    updatedAt: now + 1,
    hash: 'screenshot-build',
  },
  {
    id: 'collection-research',
    name: 'Research queue',
    color: '#db2777',
    tabGroupColor: 'pink',
    sites: [
      site('site-arxiv', 'arXiv', 'https://arxiv.org/'),
      site('site-scholar', 'Google Scholar', 'https://scholar.google.com/'),
      site('site-wiktionary', 'Wiktionary', 'https://www.wiktionary.org/'),
    ],
    createdAt: now + 2,
    updatedAt: now + 2,
    hash: 'screenshot-research',
  },
]

const notes: Note[] = [
  {
    id: 'note-launch',
    content: '**Launch checklist**\n\n- Review README screenshots\n- Verify Chrome extension flow',
    sourceDomain: 'github.com',
    sourceUrl: 'https://github.com/',
    createdAt: now,
    updatedAt: now,
    hash: 'screenshot-note-launch',
  },
  {
    id: 'note-learning',
    content: 'Compare YouTube tutorials with Wikipedia references for the research board.',
    sourceDomain: 'wikipedia.org',
    sourceUrl: 'https://www.wikipedia.org/',
    createdAt: now - 3_600_000,
    updatedAt: now - 3_600_000,
    hash: 'screenshot-note-learning',
  },
]

async function launchExtensionContext(): Promise<{ context: BrowserContext; extId: string }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--headless=new',
      '--window-size=1440,900',
    ],
  })

  let [background] = context.serviceWorkers()
  if (!background) {
    background = await context.waitForEvent('serviceworker', { timeout: 15_000 })
  }

  const extId = background.url().split('/')[2]
  if (!extId) throw new Error('Failed to parse extension id from service worker URL.')

  return { context, extId }
}

async function seedScreenshotData(page: Page) {
  await page.evaluate(
    async ({ collections, notes }) => {
      const settings = {
        theme: 'light',
        accentColor: '#4f46e5',
        blockedDomains: [],
        openCollectionMode: 'tab-group',
        colorPalette: [
          { id: 'indigo', name: 'Indigo', color: '#4f46e5', tabGroupColor: 'blue' },
          { id: 'green', name: 'Green', color: '#059669', tabGroupColor: 'green' },
          { id: 'blue', name: 'Blue', color: '#2563eb', tabGroupColor: 'blue' },
          { id: 'pink', name: 'Pink', color: '#db2777', tabGroupColor: 'pink' },
          { id: 'orange', name: 'Orange', color: '#f97316', tabGroupColor: 'orange' },
          { id: 'teal', name: 'Teal', color: '#0f766e', tabGroupColor: 'cyan' },
        ],
      }

      const data: Record<string, unknown> = {
        'katab:collections:index': collections.map((collection) => collection.id),
        'katab:notes:index': notes.map((note) => note.id),
        'katab:settings': settings,
      }

      for (const collection of collections) {
        data[`katab:collection:${collection.id}`] = collection
      }
      for (const note of notes) {
        data[`katab:note:${note.id}`] = note
      }

      await new Promise<void>((resolve) => chrome.storage.sync.clear(resolve))
      await new Promise<void>((resolve) => chrome.storage.local.clear(resolve))
      await new Promise<void>((resolve) => chrome.storage.sync.set(data, resolve))
    },
    { collections, notes },
  )
}

async function openSeededNewTab(context: BrowserContext, extId: string) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/newtab.html`)
  await seedScreenshotData(page)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.locator('[data-collection-id]').first().waitFor({ state: 'visible' })
  await page.waitForTimeout(500)
  return page
}

async function openSeededOptions(context: BrowserContext, extId: string) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/options.html`)
  await seedScreenshotData(page)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('heading', { name: 'Appearance & Behavior' }).waitFor({ state: 'visible' })
  await page.waitForTimeout(500)
  return page
}

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(screenshotsDir, name),
    fullPage: false,
  })
}

async function openMockTab(context: BrowserContext, url: string, title: string) {
  const page = await context.newPage()
  await page.route(url, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>${title}</title><main style="font-family: system-ui; padding: 48px;"><h1>${title}</h1><p>Mock page for KaTab README screenshots.</p></main>`,
    })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  return page
}

test.describe('README screenshots', () => {
  test('generates all README screenshot assets', async () => {
    fs.mkdirSync(screenshotsDir, { recursive: true })

    const { context, extId } = await launchExtensionContext()
    try {
      const youtube = await openMockTab(context, 'https://www.youtube.com/', 'YouTube')
      await openMockTab(context, 'https://www.wikipedia.org/', 'Wikipedia')
      await youtube.close()

      const page = await openSeededNewTab(context, extId)

      await capture(page, 'overview.png')
      await page.locator('.collections-panel').screenshot({
        path: path.join(screenshotsDir, 'collections-board.png'),
      })
      // Wait for favicons inside the card to finish loading before capturing
      await page.waitForFunction(
        () => {
          const imgs = document.querySelectorAll('[data-collection-id="collection-daily"] img')
          return (
            imgs.length > 0 &&
            Array.from(imgs).every(
              (img) =>
                (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
            )
          )
        },
        { timeout: 15_000 },
      )
      await page.locator('[data-collection-id="collection-daily"]').screenshot({
        path: path.join(screenshotsDir, 'collection-card.png'),
      })
      await page.locator('.notes-panel').screenshot({
        path: path.join(screenshotsDir, 'notes-sidebar.png'),
      })
      await page.locator('.tab-tray-panel').screenshot({
        path: path.join(screenshotsDir, 'tab-tray.png'),
      })

      await page.getByPlaceholder('/ Search collections, sites, notes…').fill('wiki')
      await page.getByText('Wikipedia').first().waitFor({ state: 'visible' })
      await capture(page, 'search.png')

      const options = await openSeededOptions(context, extId)
      await capture(options, 'settings.png')
      await options
        .locator('main div[style*="grid-template-columns"] > div')
        .nth(2)
        .screenshot({
          path: path.join(screenshotsDir, 'open-collection-dialog.png'),
        })

      const demo = await context.newPage()
      await demo.route('https://demo.katab.local/readme-screenshot', async (route) => {
        await route.fulfill({
          contentType: 'text/html',
          body: `<!doctype html>
<html>
  <head>
    <title>KaTab Demo Article</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #111827;
      }
      main {
        max-width: 760px;
        margin: 72px auto;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        padding: 44px 52px;
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        color: #4f46e5;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 12px 0 18px;
        font-size: 42px;
        line-height: 1.1;
      }
      p {
        font-size: 18px;
        line-height: 1.75;
        color: #374151;
      }
      mark {
        background: #eef2ff;
        color: #312e81;
        border-radius: 6px;
        padding: 2px 4px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Research note</div>
      <h1>Save useful context while browsing</h1>
      <p id="selection-target">
        Highlight a sentence from any page and KaTab turns it into a note with source attribution.
        Use this while collecting YouTube tutorials, Wikipedia references, and documentation links
        for your next project board.
      </p>
      <p>
        The floating save action keeps the browser page in focus while your new tab workspace
        quietly organizes the selected idea.
      </p>
    </main>
  </body>
</html>`,
        })
      })
      await demo.goto('https://demo.katab.local/readme-screenshot')
      await demo.locator('#katab-content-root').waitFor({ state: 'attached' })
      await demo.locator('#selection-target').evaluate((node) => {
        const range = document.createRange()
        const text = node.firstChild
        if (!text) throw new Error('Demo selection text is missing.')
        range.setStart(text, 8)
        range.setEnd(text, 93)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 640, clientY: 220 }))
      })
      await demo.waitForTimeout(200)
      await capture(demo, 'floating-ka-button.png')

      const kaButton = demo.locator('#katab-content-root').evaluateHandle((host) => {
        const root = (host as HTMLElement).shadowRoot
        const button = root?.querySelector('button')
        if (!button) throw new Error('KA button not found.')
        return button
      })
      const buttonHandle = await kaButton
      await buttonHandle.asElement()?.click()
      await demo.waitForTimeout(300)
      await capture(demo, 'floating-note-panel.png')
    } finally {
      await context.close()
    }
  })
})
