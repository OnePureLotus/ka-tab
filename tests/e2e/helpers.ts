/**
 * Shared E2E helper utilities for KaTab.
 *
 * These helpers encapsulate reusable interaction patterns so test files stay
 * focused on assertions rather than plumbing.
 */
import type { Page, Locator } from '@playwright/test'

// ─── Board readiness ──────────────────────────────────────────────────────────

/**
 * Waits until the collections board has finished loading:
 * either the empty-state or the grid with at least one card is visible.
 */
export async function waitForBoardReady(page: Page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('.collections-panel')
    if (!panel) return false
    // Empty state text or a collection card (has data-collection-id)
    return (
      panel.textContent?.includes('No collections yet') ||
      panel.querySelector('[data-collection-id]') !== null ||
      // Also accept the "Create Collection" placeholder card
      panel.textContent?.includes('Create Collection') === true
    )
  }, { timeout: 8000 })
}

// ─── Create collection ────────────────────────────────────────────────────────

/**
 * Opens the "New Collection" modal.
 * - When the board is EMPTY  → clicks "Create your first Collection"
 * - When the board has cards → clicks the "Create Collection" placeholder card
 */
export async function openCreateModal(page: Page) {
  await waitForBoardReady(page)

  const emptyBtn = page.getByRole('button', { name: 'Create your first Collection' })
  if (await emptyBtn.isVisible()) {
    await emptyBtn.click()
  } else {
    // placeholder card in the grid — exact text match to avoid matching the modal
    await page.locator('.collections-panel').getByRole('button', { name: 'Create Collection' }).click()
  }
  // Wait for modal title
  await page.getByText('New Collection').waitFor({ state: 'visible' })
}

/**
 * Creates a collection via the UI modal and waits for the card to appear.
 * Returns a locator for the new card.
 */
export async function createCollectionViaUI(page: Page, name: string): Promise<Locator> {
  await openCreateModal(page)
  await page.getByPlaceholder(/e\.g\. Work/i).fill(name)
  await page.getByRole('button', { name: /^Create$/ }).click()
  // Wait for the card to appear using text filter
  const card = page.locator('[data-collection-id]').filter({ hasText: name })
  await card.waitFor({ state: 'visible', timeout: 12000 })
  // Extract the stable data-collection-id so the locator survives renames/reorders
  const collectionId = await card.getAttribute('data-collection-id')
  return page.locator(`[data-collection-id="${collectionId}"]`)
}

// ─── Context menu helpers ─────────────────────────────────────────────────────

/** Opens the "…" context menu of a given collection card. */
export async function openCardMenu(card: Locator) {
  await card.getByTitle('More options').click()
}

/**
 * Deletes a collection card via its context menu.
 * Automatically accepts the confirm() dialog.
 */
export async function deleteCollection(page: Page, card: Locator) {
  page.once('dialog', (d) => d.accept())
  await openCardMenu(card)
  // Use exact match to avoid matching a collection named "Delete*"
  await page.getByText('Delete', { exact: true }).click()
}
