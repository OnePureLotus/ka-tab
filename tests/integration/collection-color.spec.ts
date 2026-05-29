import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady, openCardMenu } from '../e2e/helpers'

test.describe('IT-CC: Collection Color Persistence', () => {
  test('IT-CC-01: changing color updates card border immediately', async ({ freshPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Colorful')
    const cardInner = card.locator('> div').first()

    const styleBefore = await cardInner.getAttribute('style')

    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()

    const colorButtons = page.locator('button').filter({ has: page.locator('div[style*="border-radius: 6px"]') })
    await colorButtons.nth(2).click()
    await page.getByRole('button', { name: 'Save color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).not.toBeVisible()

    const styleAfter = await cardInner.getAttribute('style')
    expect(styleAfter).not.toBe(styleBefore)
  })

  test('IT-CC-02: multiple collections retain their styles after reload', async ({ freshPage: page, openNewtab }) => {
    await waitForBoardReady(page)

    const names = ['Alpha', 'Beta', 'Gamma']
    const stylesBefore: (string | null)[] = []

    for (const name of names) {
      const card = await createCollectionViaUI(page, name)
      stylesBefore.push(await card.locator('> div').first().getAttribute('style'))
    }

    const newPage = await openNewtab()
    await waitForBoardReady(newPage)

    for (let i = 0; i < names.length; i++) {
      const cardAfter = newPage.locator('[data-collection-id]').filter({ hasText: names[i] })
      await expect(cardAfter).toBeVisible()
      const styleAfter = await cardAfter.locator('> div').first().getAttribute('style')
      expect(styleAfter).toBe(stylesBefore[i])
    }
  })
})
