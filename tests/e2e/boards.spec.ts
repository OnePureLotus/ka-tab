import { expect, test } from './fixtures'
import {
  createBoardViaUI,
  createCollectionViaUI,
  waitForBoardReady,
  waitForBoardSwitcher,
} from './helpers'

test.describe('Boards', () => {
  test('E2E-B-01: migration creates default board on first load', async ({ newtabPage: page }) => {
    await waitForBoardSwitcher(page)
    const panel = page.locator('.collections-panel')
    await expect(panel.getByRole('tab', { name: 'Default' })).toBeVisible()
  })

  test('E2E-B-02: can create a new board and switch to it', async ({ newtabPage: page }) => {
    await waitForBoardSwitcher(page)
    const panel = page.locator('.collections-panel')
    await createBoardViaUI(page, 'Personal')
    await expect(panel.getByRole('tab', { name: 'Personal' })).toBeVisible()
    await panel.getByRole('tab', { name: 'Personal' }).click()
    await waitForBoardReady(page)
    await expect(panel.getByText('No collections in this board')).toBeVisible()
  })

  test('E2E-B-03: collections belong to the active board only', async ({ newtabPage: page }) => {
    await waitForBoardSwitcher(page)
    const panel = page.locator('.collections-panel')
    await createCollectionViaUI(page, 'Work Sites')
    await expect(
      panel.locator('[data-collection-id]').filter({ hasText: 'Work Sites' }),
    ).toBeVisible()

    await createBoardViaUI(page, 'Personal')
    await panel.getByRole('tab', { name: 'Personal' }).click()
    await waitForBoardReady(page)
    await expect(panel.getByText('No collections in this board')).toBeVisible()

    await panel.getByRole('tab', { name: 'Default' }).click()
    await expect(
      panel.locator('[data-collection-id]').filter({ hasText: 'Work Sites' }),
    ).toBeVisible()
  })
})
