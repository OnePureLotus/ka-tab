/**
 * Integration Tests: Notes Full Lifecycle
 *
 * IT-N-01  Create note → content persists on reload
 * IT-N-02  Create multiple notes → all present after reload
 * IT-N-03  Delete note → gone after reload
 * IT-N-04  Delete the only note → panel returns to empty state
 * IT-N-05  Notes panel state is independent from collections (cross-module)
 */

import { test, expect } from './fixtures'
import { waitForBoardReady, createCollectionViaUI, openNotesPanel, addNoteViaUI } from './helpers'

test.describe('IT-N: Notes Lifecycle', () => {
  // IT-N-01: Note persists on reload
  test('IT-N-01: note content survives page reload', async ({ freshPage: page }) => {
    await openNotesPanel(page)
    await page.locator('.notes-panel textarea').fill('My important note')
    await page.keyboard.press('Control+Enter')
    await expect(page.locator('.notes-panel').getByText('My important note')).toBeVisible({ timeout: 5_000 })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await openNotesPanel(page)
    await expect(page.locator('.notes-panel').getByText('My important note')).toBeVisible()
  })

  // IT-N-02: Multiple notes survive reload
  test('IT-N-02: multiple notes all present after reload', async ({ freshPage: page }) => {
    await openNotesPanel(page)

    for (const content of ['Note Alpha', 'Note Beta', 'Note Gamma']) {
      await page.locator('.notes-panel textarea').fill(content)
      await page.keyboard.press('Control+Enter')
      await expect(page.locator('.notes-panel').getByText(content)).toBeVisible({ timeout: 5_000 })
      await page.waitForTimeout(200)
    }

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await openNotesPanel(page)
    await expect(page.locator('.notes-panel').getByText('Note Alpha')).toBeVisible()
    await expect(page.locator('.notes-panel').getByText('Note Beta')).toBeVisible()
    await expect(page.locator('.notes-panel').getByText('Note Gamma')).toBeVisible()
  })

  // IT-N-03: Delete note and verify gone on reload
  test('IT-N-03: deleted note is absent after reload', async ({ freshPage: page }) => {
    await addNoteViaUI(page, 'Note to delete')

    // Hover to reveal delete button (it is inside Show when={hovered()})
    const noteText = page.locator('.notes-panel').getByText('Note to delete')
    await noteText.hover()
    const deleteBtn = page.getByTitle('Delete note')
    await expect(deleteBtn).toBeVisible({ timeout: 2_000 })
    await deleteBtn.click()
    await expect(noteText).not.toBeVisible({ timeout: 3_000 })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await openNotesPanel(page)
    await expect(page.locator('.notes-panel').getByText('Note to delete')).not.toBeVisible()
  })

  // IT-N-04: Delete only note → empty state shown
  test('IT-N-04: deleting the only note shows empty notes state', async ({ freshPage: page }) => {
    await addNoteViaUI(page, 'Only note')

    const noteText = page.locator('.notes-panel').getByText('Only note')
    await noteText.hover()
    const deleteBtn = page.getByTitle('Delete note')
    await expect(deleteBtn).toBeVisible({ timeout: 2_000 })
    await deleteBtn.click()

    await expect(page.locator('.notes-panel').getByText('No notes yet.')).toBeVisible({ timeout: 3_000 })
  })


  // IT-N-05: Notes and collections are independent
  test('IT-N-05: notes and collections coexist without interfering', async ({ freshPage: page }) => {
    // Create a collection
    await createCollectionViaUI(page, 'Side-by-Side')

    // Add a note
    await openNotesPanel(page)
    await page.locator('.notes-panel textarea').fill('Note alongside collection')
    await page.keyboard.press('Control+Enter')
    await expect(page.locator('.notes-panel').getByText('Note alongside collection')).toBeVisible({ timeout: 5_000 })

    // Reload — both collection and note must survive
    await page.reload()
    await waitForBoardReady(page)
    await expect(page.locator('[data-collection-id]').filter({ hasText: 'Side-by-Side' })).toBeVisible()

    await openNotesPanel(page)
    await expect(page.locator('.notes-panel').getByText('Note alongside collection')).toBeVisible()
  })
})
