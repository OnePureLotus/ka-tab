import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from './helpers'

const SITE_REORDER_MIME = 'application/katab-site-reorder'

async function addSiteToCard(page: Page, card: Locator, url: string) {
  await card.getByRole('button', { name: /add site/i }).click()
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(url)
  await page.getByRole('button', { name: /^Add site$/ }).click()
  await expect(page.getByText(/Add site to/i)).not.toBeVisible({ timeout: 5_000 })
}

async function expectSiteOrder(card: Locator, hosts: string[]) {
  const rows = card.locator('.collection-site-row')
  await expect(rows).toHaveCount(hosts.length)
  for (let i = 0; i < hosts.length; i++) {
    await expect(rows.nth(i)).toContainText(hosts[i])
  }
}

/** Dispatch native DragEvents — Playwright pointer drag does not trigger HTML5 DnD. */
async function reorderSiteByHandle(card: Locator, fromIndex: number, toIndex: number) {
  const rows = card.locator('.collection-site-row')
  const fromSiteId = await rows.nth(fromIndex).getAttribute('data-site-id')
  const toSiteId = await rows.nth(toIndex).getAttribute('data-site-id')
  if (!fromSiteId || !toSiteId) throw new Error('Missing site id on collection row')

  await card.evaluate(
    (cardEl, { fromId, toId, mime }) => {
      const fromRow = cardEl.querySelector(`[data-site-id="${fromId}"]`)
      const toRow = cardEl.querySelector(`[data-site-id="${toId}"]`)
      const handle = fromRow?.querySelector('[data-testid="site-drag-handle"]')
      if (!handle || !toRow) throw new Error('Drag elements not found')

      const dt = new DataTransfer()
      dt.setData(mime, fromId)

      handle.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
      toRow.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
      toRow.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
      handle.dispatchEvent(
        new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
    },
    { fromId: fromSiteId, toId: toSiteId, mime: SITE_REORDER_MIME },
  )
}

test.describe('Collection site reorder', () => {
  test('E2E-CS-01: drag handle reorders sites on card and persists after reload', async ({
    newtabPage: page,
  }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'ReorderMe')

    await addSiteToCard(page, card, 'https://alpha.example.com')
    await addSiteToCard(page, card, 'https://beta.example.com')

    await expect(card.getByTestId('site-drag-handle')).toHaveCount(2)
    await expectSiteOrder(card, ['alpha.example.com', 'beta.example.com'])

    await reorderSiteByHandle(card, 0, 1)
    await expectSiteOrder(card, ['beta.example.com', 'alpha.example.com'])

    await page.reload()
    await waitForBoardReady(page)

    const reloadedCard = page.locator('[data-collection-id]').filter({ hasText: 'ReorderMe' })
    await expectSiteOrder(reloadedCard, ['beta.example.com', 'alpha.example.com'])
  })
})
