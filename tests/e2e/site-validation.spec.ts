import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from './helpers'

test.describe('Site URL Validation', () => {
  test('E2E-SV-01: invalid URL shows error message', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    // Open add site dialog
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('not-a-url')
    await page.getByRole('button', { name: /^Add site$/ }).click()

    // Should show error message "Please enter a valid URL"
    await expect(page.locator('text=valid URL')).toBeVisible()
  })

  test('E2E-SV-02: empty URL shows "URL is required" error when submit clicked', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    // Open add site dialog
    await card.getByText('+ Add site').click()

    // Add site button should be enabled (validation happens on click, not before)
    const addButton = page.getByRole('button', { name: /^Add site$/ })
    await expect(addButton).toBeEnabled()
    
    // Click with empty URL
    await addButton.click()
    
    // Should show error "URL is required"
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('E2E-SV-03: malformed URL without protocol shows error', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    // Try URL without protocol (new URL('github.com') throws)
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('github.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    
    // Should show error (browser's URL parser requires protocol)
    await expect(page.locator('text=valid URL')).toBeVisible()
  })

  test('E2E-SV-04: valid HTTPS URL is accepted', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    // Add HTTPS URL
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://example.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    
    // Wait for dialog to close before checking the card
    await expect(page.getByText(/Add site to Test/i)).not.toBeVisible()
    await expect(card.locator('text=example.com')).toBeVisible({ timeout: 5000 })
  })

  test('E2E-SV-05: duplicate URL shows warning toast', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')

    // Add a site
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://github.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    // Wait for dialog to close before verifying site was saved
    await expect(page.getByText(/Add site to Test/i)).not.toBeVisible({ timeout: 10000 })
    await expect(card.locator('text=github.com')).toBeVisible({ timeout: 5000 })
    
    // Add same URL again
    await card.getByText('+ Add site').click()
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://github.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()

    // Should show warning "URL already exists"
    await expect(page.locator('text=already exists')).toBeVisible({ timeout: 5000 })
  })
})
