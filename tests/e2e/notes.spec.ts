/**
 * E2E tests – Notes Panel
 *
 * Each test starts with a FRESH page (empty storage).
 * Notes that need pre-existing content are created via UI in the test body.
 *
 * Key selectors:
 *  - Panel:    `.notes-panel`
 *  - Textarea: placeholder "Capture an idea or paste selected text..."
 *  - Save btn: role=button name="Save"
 *  - Note cards: `.notes-panel [style*="border-radius: 8px"]`
 *  - Delete btn: title="Delete note" (visible on hover)
 */
import { test, expect } from './fixtures'

test.describe('Notes Panel', () => {
  // E2E-N-01: panel is always visible
  test('E2E-N-01: notes panel is visible on the right side of the newtab page', async ({ newtabPage: page }) => {
    await expect(page.locator('.notes-panel')).toBeVisible()
    await expect(page.locator('.notes-panel').getByText('Notes', { exact: true })).toBeVisible()
  })

  // E2E-N-02: empty state — no notes yet
  test('E2E-N-02: empty state message shown when there are no notes', async ({ newtabPage: page }) => {
    await expect(page.locator('.notes-panel').getByText('No notes yet.')).toBeVisible()
  })

  // E2E-N-03: Save is disabled when textarea is blank
  test('E2E-N-03: Save button is disabled when the textarea is empty', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    // Button is disabled when content is blank (opacity 0.5, disabled attr set)
    const saveBtn = panel.getByRole('button', { name: /^Save$/ })
    await expect(saveBtn).toBeDisabled()
  })

  // E2E-N-04: Save is enabled after typing content
  test('E2E-N-04: Save button becomes enabled after typing content', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    await panel.getByPlaceholder(/Capture an idea/i).fill('Hello')
    await expect(panel.getByRole('button', { name: /^Save$/ })).toBeEnabled()
  })

  // E2E-N-05: saving a note creates a note card and clears the textarea
  test('E2E-N-05: clicking Save creates a note card and clears the textarea', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    const textarea = panel.getByPlaceholder(/Capture an idea/i)

    await textarea.fill('My first note')
    await panel.getByRole('button', { name: /^Save$/ }).click()

    // Card appears
    await expect(panel.getByText('My first note')).toBeVisible()
    // Textarea is cleared
    await expect(textarea).toHaveValue('')
    // Empty state disappears
    await expect(panel.getByText('No notes yet.')).not.toBeVisible()
  })

  // E2E-N-06: Cmd/Ctrl+Enter keyboard shortcut saves a note
  test('E2E-N-06: Ctrl+Enter shortcut saves a note', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    const textarea = panel.getByPlaceholder(/Capture an idea/i)

    await textarea.click()
    await textarea.fill('Shortcut note')
    await textarea.press('Control+Enter')

    await expect(panel.getByText('Shortcut note')).toBeVisible()
  })

  // E2E-N-07: markdown bold is rendered as <strong>
  test('E2E-N-07: markdown **bold** is rendered as <strong> in the note card', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    const textarea = panel.getByPlaceholder(/Capture an idea/i)

    await textarea.fill('**bold text**')
    await panel.getByRole('button', { name: /^Save$/ }).click()

    await expect(panel.locator('strong').filter({ hasText: 'bold text' })).toBeVisible()
  })

  // E2E-N-08: hovering a note card reveals the delete button
  test('E2E-N-08: hovering a note card reveals the delete (×) button', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    await panel.getByPlaceholder(/Capture an idea/i).fill('Hover me')
    await panel.getByRole('button', { name: /^Save$/ }).click()

    // Wait for the note to appear, then hover its text to trigger the card's onMouseEnter
    await expect(panel.getByText('Hover me')).toBeVisible()
    await panel.getByText('Hover me').hover()

    // Delete button is conditionally rendered (SolidJS Show) — appears on hover
    await expect(panel.getByTitle('Delete note')).toBeVisible()
  })

  // E2E-N-09: clicking the delete button removes the note
  test('E2E-N-09: clicking delete button removes the note card', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    await panel.getByPlaceholder(/Capture an idea/i).fill('Delete this')
    await panel.getByRole('button', { name: /^Save$/ }).click()
    await expect(panel.getByText('Delete this')).toBeVisible()

    await panel.getByText('Delete this').hover()
    await panel.getByTitle('Delete note').click()

    await expect(panel.getByText('Delete this')).not.toBeVisible()
  })

  // E2E-N-10: deleting the last note restores the empty state
  test('E2E-N-10: deleting the only note restores the empty-state message', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    await panel.getByPlaceholder(/Capture an idea/i).fill('Solo note')
    await panel.getByRole('button', { name: /^Save$/ }).click()
    await expect(panel.getByText('Solo note')).toBeVisible()

    await panel.getByText('Solo note').hover()
    await panel.getByTitle('Delete note').click()

    await expect(panel.getByText('No notes yet.')).toBeVisible()
  })

  // E2E-N-11: multiple notes appear in the panel list
  test('E2E-N-11: multiple saved notes all appear as separate cards', async ({ newtabPage: page }) => {
    const panel = page.locator('.notes-panel')
    const textarea = panel.getByPlaceholder(/Capture an idea/i)
    const saveBtn = panel.getByRole('button', { name: /^Save$/ })

    for (const content of ['Note A', 'Note B', 'Note C']) {
      await textarea.fill(content)
      await saveBtn.click()
    }

    for (const content of ['Note A', 'Note B', 'Note C']) {
      await expect(panel.getByText(content)).toBeVisible()
    }
  })
})
