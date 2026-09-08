/**
 * Shared E2E helper utilities for KaTab.
 */
import type { Locator, Page } from '@playwright/test'

export async function waitForBoardReady(page: Page) {
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
    { timeout: 8000 },
  )
}

export async function waitForBoardSwitcher(page: Page) {
  await page.waitForFunction(
    () => {
      const switcher = document.querySelector('[data-testid="board-switcher"]')
      return switcher !== null
    },
    { timeout: 8000 },
  )
}

export async function openCreateModal(page: Page) {
  await waitForBoardReady(page)

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
}

export async function createCollectionViaUI(page: Page, name: string): Promise<Locator> {
  await openCreateModal(page)
  await page.getByPlaceholder(/e\.g\. Work/i).fill(name)
  await page.getByRole('button', { name: /^Create$/ }).click()
  const card = page.locator('[data-collection-id]').filter({ hasText: name })
  await card.waitFor({ state: 'visible', timeout: 12000 })
  const collectionId = await card.getAttribute('data-collection-id')
  return page.locator(`[data-collection-id="${collectionId}"]`)
}

export async function createBoardViaUI(page: Page, name: string) {
  await waitForBoardSwitcher(page)
  const panel = page.locator('.collections-panel')
  await panel.getByRole('button', { name: '+ New board' }).click()
  await page.getByText('New Board').waitFor({ state: 'visible' })
  await page.getByPlaceholder(/e\.g\. Work, Personal/i).fill(name)
  await page.getByRole('button', { name: /^Create$/ }).click()
  await panel.getByRole('tab', { name }).waitFor({ state: 'visible' })
}

export async function openCardMenu(card: Locator) {
  await card.getByTitle('More options').click()
}

export async function deleteCollection(page: Page, card: Locator) {
  page.once('dialog', (d) => d.accept())
  await openCardMenu(card)
  await page.getByText('Delete', { exact: true }).click()
}
