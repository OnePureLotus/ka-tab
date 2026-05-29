import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady } from '../e2e/helpers'

async function addSiteToCard(page: import('@playwright/test').Page, card: import('@playwright/test').Locator, url: string) {
  const domain = new URL(url).hostname
  await card.getByText('+ Add site').click()
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(url)
  await page.getByRole('button', { name: /^Add site$/ }).click()
  await expect(card.locator(`text=${domain}`)).toBeVisible({ timeout: 5000 })
}

test.describe('IT-CM: CollectionModal Multi-step Workflows', () => {
  test('IT-CM-01: open modal → remove site → close → reopen → site is gone', async ({ freshPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test Collection')
    
    await addSiteToCard(page, card, 'https://github.com')
    await addSiteToCard(page, card, 'https://stackoverflow.com')

    // Open modal by clicking collection name
    await card.locator('span').filter({ hasText: 'Test Collection' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()
    await expect(modal.locator('text=github.com').first()).toBeVisible()
    
    // Remove first site
    await modal.locator('[title="Remove site"]').first().click()
    await page.waitForTimeout(300)
    
    // Close modal by clicking overlay
    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } })
    
    // Reopen modal
    await card.locator('span').filter({ hasText: 'Test Collection' }).click()
    
    // Should only show one site now
    const modalAfter = page.locator('.modal-content')
    await expect(modalAfter).toBeVisible()
    await expect(modalAfter.locator('text=stackoverflow.com').first()).toBeVisible()
    const siteItems = modalAfter.locator('[title="Remove site"]')
    await expect(siteItems).toHaveCount(1)
  })

  test('IT-CM-02: search sites → clear search → all sites return', async ({ freshPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Resources')
    
    await addSiteToCard(page, card, 'https://github.com')
    await addSiteToCard(page, card, 'https://docs.python.org')

    // Open modal
    await card.locator('span').filter({ hasText: 'Resources' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()
    
    // Search for "python"
    const searchInput = modal.getByPlaceholder(/search/i)
    await searchInput.fill('python')
    
    await expect(modal.locator('text=python.org').first()).toBeVisible()
    await expect(modal.locator('text=github.com').first()).not.toBeVisible()
    
    // Clear search
    await searchInput.clear()
    
    // All sites should return
    await expect(modal.locator('text=github.com').first()).toBeVisible()
    await expect(modal.locator('text=python.org').first()).toBeVisible()
  })

  test('IT-CM-03: add site from modal → reload → site persists', async ({ freshPage: page, openNewtab }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'My Links')
    
    // Open modal
    await card.locator('span').filter({ hasText: 'My Links' }).click()
    const modal = page.locator('.modal-content')
    await expect(modal).toBeVisible()
    
    // Clicking "Add site" from the modal closes the modal and opens AddSiteDialog
    await modal.getByRole('button', { name: 'Add site' }).click()
    await expect(modal).not.toBeVisible()
    await expect(page.getByText(/Add site to My Links/i)).toBeVisible()
    
    await page.getByPlaceholder('https://platform.openai.com/docs').fill('https://example.com')
    await page.getByRole('button', { name: /^Add site$/ }).click()
    
    // Wait for site to appear on card
    await expect(card.locator('text=example.com').first()).toBeVisible({ timeout: 5000 })
    
    // Reload page
    const newPage = await openNewtab()
    await waitForBoardReady(newPage)
    
    // Site should persist
    const cardAfterReload = newPage.locator('[data-collection-id]').filter({ hasText: 'My Links' })
    await expect(cardAfterReload.locator('text=example.com').first()).toBeVisible()
  })
})
