import { test, expect } from './fixtures'
import { createCollectionViaUI, waitForBoardReady, openCardMenu } from './helpers'

test.describe('Collection Color Picker', () => {
  test('E2E-CC-01: card menu shows "Change color" option', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'My Collection')
    
    // Open the "More options" menu via the ellipsis button
    await openCardMenu(card)
    
    // Menu should show "Change color" button
    await expect(page.getByRole('button', { name: 'Change color' })).toBeVisible()
  })

  test('E2E-CC-02: clicking "Change color" opens the ChangeColorModal', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    
    // ChangeColorModal shows "Change Color" text heading
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()
  })

  test('E2E-CC-03: selecting a color and saving updates the collection', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()
    
    // Pick first color in the palette grid
    const colorButtons = page.locator('button').filter({ has: page.locator('div[style*="border-radius: 6px"]') })
    await colorButtons.first().click()
    
    // Save the color
    await page.getByRole('button', { name: 'Save color' }).click()
    
    // Modal closes and card remains visible
    await expect(page.getByText('Change Color', { exact: true })).not.toBeVisible()
    await expect(card).toBeVisible()
  })

  test('E2E-CC-04: changing collection color to different palette entries', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Colorful')
    // The inner card div (direct child) has the border color in its style attribute
    const cardInner = card.locator('> div').first()
    
    // Change color to first palette entry
    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()
    
    const colorButtons = page.locator('button').filter({ has: page.locator('div[style*="border-radius: 6px"]') })
    await colorButtons.first().click()
    await page.getByRole('button', { name: 'Save color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).not.toBeVisible()
    
    const colorAfterFirst = await cardInner.getAttribute('style')
    
    // Change color to second palette entry (different color)
    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()
    
    await colorButtons.nth(1).click()
    await page.getByRole('button', { name: 'Save color' }).click()
    
    const colorAfterSecond = await cardInner.getAttribute('style')
    expect(colorAfterSecond).not.toBe(colorAfterFirst)
  })

  test('E2E-CC-05: "Cancel" closes color picker without changing color', async ({ newtabPage: page }) => {
    await waitForBoardReady(page)
    const card = await createCollectionViaUI(page, 'Test')
    
    const colorBefore = await card.getAttribute('style')
    
    await openCardMenu(card)
    await page.getByRole('button', { name: 'Change color' }).click()
    await expect(page.getByText('Change Color', { exact: true })).toBeVisible()
    
    // Cancel without selecting
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Modal gone, color unchanged
    await expect(page.getByText('Change Color', { exact: true })).not.toBeVisible()
    const colorAfter = await card.getAttribute('style')
    expect(colorAfter).toBe(colorBefore)
  })
})
