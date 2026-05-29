/**
 * E2E tests – Collections Board
 *
 * Each test:
 *  1. Receives a FRESH page with cleared storage (via `newtabPage` fixture)
 *  2. Waits for the board to finish loading
 *  3. Tests ONE specific behaviour
 *
 * Context notes:
 *  - EMPTY board   → "No collections yet" visible, "Create your first Collection" button
 *  - NON-EMPTY board → collection cards grid, "Create Collection" placeholder card
 *  - Delete triggers a native confirm() dialog → handled with page.once('dialog')
 */
import { test, expect } from './fixtures'
import { waitForBoardReady, openCreateModal, createCollectionViaUI, openCardMenu, deleteCollection } from './helpers'

// ─── Empty-board context ──────────────────────────────────────────────────────

test.describe('Collections Board – empty state', () => {
  // E2E-C-01: initial empty state renders correctly
  test('E2E-C-01: shows empty-state UI when no collections exist', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await expect(page.getByText('No collections yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create your first Collection' })).toBeVisible()
  })

  // E2E-C-02: clicking the empty-state CTA opens the create modal
  test('E2E-C-02: clicking "Create your first Collection" opens the modal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await page.getByRole('button', { name: 'Create your first Collection' }).click()
    await expect(page.getByText('New Collection')).toBeVisible()
    await expect(page.getByPlaceholder(/e\.g\. Work/i)).toBeVisible()
  })

  // E2E-C-03: "Create" button disabled when name field is empty
  test('E2E-C-03: Create button is disabled when name field is blank', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await openCreateModal(page)
    const createBtn = page.getByRole('button', { name: /^Create$/ })
    await expect(createBtn).toBeDisabled()
  })

  // E2E-C-04: creating a collection shows a card on the board
  test('E2E-C-04: creating a collection makes its card appear on the board', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Work')
    await expect(card).toBeVisible()
    // Empty-state text must be gone
    await expect(page.getByText('No collections yet')).not.toBeVisible()
  })

  // E2E-C-05: Pressing Enter in the name field submits the form
  test('E2E-C-05: pressing Enter in the name field creates the collection', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await openCreateModal(page)
    await page.getByPlaceholder(/e\.g\. Work/i).fill('Research')
    await page.getByPlaceholder(/e\.g\. Work/i).press('Enter')
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'Research' })).toBeVisible()
  })
})

// ─── Non-empty board context ──────────────────────────────────────────────────

test.describe('Collections Board – with collections', () => {
  // E2E-C-06: "Create Collection" placeholder card is visible when collections exist
  test('E2E-C-06: "Create Collection" card is visible once board has items', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await createCollectionViaUI(page, 'Alpha')
    // The "+" placeholder card should be visible
    await expect(page.locator('.collections-panel').getByRole('button', { name: 'Create Collection' })).toBeVisible()
  })

  // E2E-C-07: clicking "Create Collection" card opens the modal (non-empty context)
  test('E2E-C-07: clicking "Create Collection" card opens the modal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await createCollectionViaUI(page, 'Alpha')
    await page.locator('.collections-panel').getByRole('button', { name: 'Create Collection' }).click()
    await expect(page.getByText('New Collection')).toBeVisible()
  })

  // E2E-C-08: collection count badge updates after creation
  test('E2E-C-08: counter badge shows correct count after creating two collections', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await createCollectionViaUI(page, 'First')
    await createCollectionViaUI(page, 'Second')
    await expect(page.getByText('2 collections')).toBeVisible()
  })

  // E2E-C-09: renaming a collection via the context menu
  test('E2E-C-09: rename collection via context menu → new name appears on card', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'OldName')

    await openCardMenu(card)
    await page.getByText('Change name').click()

    // Rename input appears inside the card header with autofocus
    const renameInput = card.locator('input').first()
    await renameInput.clear()
    await renameInput.fill('NewName')
    await renameInput.press('Enter')

    await expect(card).toContainText('NewName')
    await expect(card).not.toContainText('OldName')
  })

  // E2E-C-10: pressing Escape during rename cancels the edit
  test('E2E-C-10: pressing Escape during rename cancels and restores original name', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'KeepMe')

    await openCardMenu(card)
    await page.getByText('Change name').click()

    const renameInput = card.locator('input').first()
    await renameInput.fill('DiscardMe')
    await renameInput.press('Escape')

    await expect(card).toContainText('KeepMe')
    await expect(card).not.toContainText('DiscardMe')
  })

  // E2E-C-11: deleting a collection removes its card
  test('E2E-C-11: deleting a collection removes its card from the board', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'DeleteMe')
    await deleteCollection(page, card)
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'DeleteMe' })).not.toBeVisible()
  })

  // E2E-C-12: deleting the last collection returns to the empty state
  test('E2E-C-12: deleting the only collection restores the empty state', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Solo')
    await deleteCollection(page, card)
    await expect(page.getByText('No collections yet')).toBeVisible()
  })

  // E2E-C-13: "Open all" button is disabled for an empty collection
  test('E2E-C-13: "Open all" is disabled when collection has no sites', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Empty')
    await expect(card.getByText('Open all')).toBeDisabled()
  })

  // E2E-C-14: "+ Add site" button opens the AddSiteDialog
  test('E2E-C-14: clicking "+ Add site" opens the site-add dialog', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'MySites')
    await card.getByText('+ Add site').click()
    // AddSiteDialog renders "Add site to MySites" heading
    await expect(page.getByText(/Add site to MySites/i)).toBeVisible()
    // URL input placeholder
    await expect(page.getByPlaceholder('https://platform.openai.com/docs')).toBeVisible()
  })

  // E2E-C-15: adding a valid site URL saves and closes the dialog
  test('E2E-C-15: adding a valid URL to a collection creates a site entry', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'WithSite')
    await card.getByText('+ Add site').click()

    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://example.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()

    // Dialog closes and site appears in card
    await expect(page.getByText(/Add site to WithSite/i)).not.toBeVisible()
    await expect(card.getByText('example.com')).toBeVisible()
  })

  // E2E-C-16: "Open all" button becomes enabled after a site is added
  test('E2E-C-16: "Open all" enables after a site is added', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'ReadyToOpen')
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://example.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()

    await expect(card.getByText('Open all')).toBeEnabled()
  })

  // E2E-C-17: search bar filters collection cards by name
  test('E2E-C-17: search filters collection cards by name', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await createCollectionViaUI(page, 'AlphaProjects')
    await createCollectionViaUI(page, 'BetaDesign')

    await page.getByPlaceholder('/ Search collections, sites, notes…').fill('Alpha')

    // Board filters: only AlphaProjects card visible
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'AlphaProjects' })).toBeVisible()
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'BetaDesign' })).not.toBeVisible()
  })

  // E2E-C-18: clearing the search restores all cards
  test('E2E-C-18: clearing the search shows all collection cards', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    await createCollectionViaUI(page, 'AlphaProjects')
    await createCollectionViaUI(page, 'BetaDesign')

    const searchInput = page.getByPlaceholder('/ Search collections, sites, notes…')
    await searchInput.fill('Alpha')
    await searchInput.clear()

    await expect(page.locator('[data-collection-id]').filter({ hasText: 'AlphaProjects' })).toBeVisible()
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'BetaDesign' })).toBeVisible()
  })
})
