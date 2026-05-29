import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from './helpers'

async function addSiteToCard(page: import('@playwright/test').Page, card: import('@playwright/test').Locator, url: string) {
  const domain = new URL(url).hostname
  await card.getByText('+ Add site').click()
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(url)
  await page.getByRole('button', { name: /^Add site$/ }).click()
  // Wait for site to appear on card (ensures reactive store update before next operation)
  await expect(card.locator(`text=${domain}`)).toBeVisible({ timeout: 5000 })
}

test.describe('CollectionModal – Full-screen detail view', () => {
  test('E2E-CM-01: clicking collection title opens the modal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'My Sites')

    // Click the collection name span to open modal
    await card.locator('span').filter({ hasText: 'My Sites' }).click()

    // Modal (.modal-content) should be visible with the collection name as h2
    await expect(page.locator('.modal-content')).toBeVisible()
    await expect(page.locator('.modal-content h2', { hasText: 'My Sites' })).toBeVisible()
  })

  test('E2E-CM-02: modal shows all sites from the collection', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Dev Tools')
    
    await addSiteToCard(page, card, 'https://github.com')
    await addSiteToCard(page, card, 'https://stackoverflow.com')

    // Open modal
    await card.locator('span').filter({ hasText: 'Dev Tools' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()

    // Should show both sites (use .first() because each site row has 2 elements containing the domain)
    await expect(modal.locator('text=github.com').first()).toBeVisible()
    await expect(modal.locator('text=stackoverflow.com').first()).toBeVisible()
  })

  test('E2E-CM-03: search input filters sites within modal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Resources')
    
    await addSiteToCard(page, card, 'https://github.com')
    await addSiteToCard(page, card, 'https://docs.python.org')

    // Open modal
    await card.locator('span').filter({ hasText: 'Resources' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()

    // Type in search box
    const searchInput = modal.getByPlaceholder(/search/i)
    await searchInput.fill('python')

    // Only python should be visible, github hidden
    await expect(modal.locator('text=python.org').first()).toBeVisible()
    await expect(modal.locator('text=github.com').first()).not.toBeVisible()
  })

  test('E2E-CM-04: "Remove site" button deletes a site', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    await addSiteToCard(page, card, 'https://example.com')

    // Open modal
    await card.locator('span').filter({ hasText: 'Test' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()
    await expect(modal.locator('text=example.com').first()).toBeVisible()

    // Click remove site button (title="Remove site")
    await modal.locator('[title="Remove site"]').first().click()

    // Site should disappear
    await expect(modal.locator('text=example.com').first()).not.toBeVisible()
  })

  test('E2E-CM-05: clicking overlay closes the modal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'My Collection')

    // Open modal
    await card.locator('span').filter({ hasText: 'My Collection' }).click()
    await expect(page.locator('.modal-content')).toBeVisible()

    // Click the overlay (outside the modal content) to close
    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } })

    // Modal should be gone
    await expect(page.locator('.modal-content')).not.toBeVisible()
  })

  test('E2E-CM-06: "+ Add site" from modal adds site then shows in modal on reopen', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Links')

    // Open modal
    await card.locator('span').filter({ hasText: 'Links' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()

    // Clicking "Add site" inside the modal closes the modal and opens AddSiteDialog
    await modal.getByRole('button', { name: 'Add site' }).click()
    
    // Modal should be closed now, AddSiteDialog should be open
    await expect(modal).not.toBeVisible()
    await expect(page.getByText(/Add site to Links/i)).toBeVisible()
    
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://google.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    
    // Wait for site to appear on the card (AddSiteDialog closes, site is added)
    await expect(card.locator('text=google.com').first()).toBeVisible({ timeout: 5000 })
    
    // Re-open modal to verify the site is now in the collection
    await card.locator('span').filter({ hasText: 'Links' }).click()
    await expect(modal).toBeVisible()
    await expect(modal.locator('text=google.com').first()).toBeVisible()
  })
})
