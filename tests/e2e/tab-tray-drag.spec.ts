import { test, expect } from './fixtures'

test.describe('Tab Tray – Drag and Drop', () => {
  test('E2E-TD-01: tab tray shows current tabs section with at least one tab', async ({ newtabPage: page }) => {
    await page.waitForTimeout(600)
    const panel = page.locator('.tab-tray-panel')
    const header = panel.getByText(/current tabs/i).first()
    await expect(header).toBeVisible({ timeout: 3_000 })

    // Verify the count inside the header is >= 1
    const headerText = await header.innerText()
    const match = headerText.match(/current tabs \((\d+)\)/i)
    expect(match, `Expected "Current tabs (N)" pattern, got: "${headerText}"`).toBeTruthy()
    expect(Number.parseInt(match![1], 10)).toBeGreaterThanOrEqual(1)
  })

  test('E2E-TD-02: tab tray items have draggable attribute set', async ({ newtabPage: page }) => {
    await page.waitForTimeout(600)
    const panel = page.locator('.tab-tray-panel')
    await expect(panel.getByText(/current tabs/i).first()).toBeVisible({ timeout: 3_000 })

    // Tab items rendered inside "Current tabs" (expanded by default) carry draggable="true"
    await page.waitForFunction(
      () => document.querySelectorAll('.tab-tray-panel [draggable="true"]').length > 0,
      { timeout: 5_000 },
    )
    const draggableItems = panel.locator('[draggable="true"]')
    await expect(draggableItems.first()).toBeVisible()
    expect(await draggableItems.count()).toBeGreaterThan(0)
  })

  test.skip('E2E-TD-03: dropping tab onto collection card adds the site', async ({ newtabPage: page }) => {
    // Playwright's locator.dragTo() uses pointer-event-based drag which does not
    // fire HTML5 DragEvent (dragstart / dragover / drop). The tab tray and collection
    // card drop zone both rely on native HTML5 drag-and-drop events, so this cannot
    // be reliably automated with Playwright without injecting custom DragEvent
    // dispatches — left for a future manual or puppeteer-based test.
  })

  test.skip('E2E-TD-04: dropping outside collection cards cancels the operation', async ({ newtabPage: page }) => {
    // Same limitation as E2E-TD-03 (HTML5 DnD not triggered by Playwright pointer drag).
  })

  test('E2E-TD-05: tab tray panel is visible on page load', async ({ newtabPage: page }) => {
    await expect(page.locator('.tab-tray-panel')).toBeVisible()
  })
})


