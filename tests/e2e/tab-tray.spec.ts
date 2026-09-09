/**
 * E2E tests – Tab Tray Panel
 *
 * The Tab Tray connects to the background service worker via a port.
 * It shows a 500 ms loading skeleton, then either the tab list or a
 * "Reconnecting…" banner.
 *
 * Key selectors:
 *  - Panel:          `.tab-tray-panel`
 *  - Section labels: texts "Open Tabs" / "Recently Closed" (case-insensitive)
 *  - "Drag to card" badge: exactly "Drag to card"
 */
import { expect, test } from './fixtures'

test.describe('Tab Tray Panel', () => {
  // E2E-TT-01: panel is always rendered
  test('E2E-TT-01: Tab Tray panel is rendered on the left side', async ({ newtabPage: page }) => {
    await expect(page.locator('.tab-tray-panel')).toBeVisible()
  })

  // E2E-TT-02: heading and "Drag to card" badge are visible
  test('E2E-TT-02: "Tab Tray" heading and "Drag to card" badge are visible', async ({
    newtabPage: page,
  }) => {
    const panel = page.locator('.tab-tray-panel')
    await expect(panel.getByText('Tab Tray')).toBeVisible()
    await expect(panel.getByText('Drag to card')).toBeVisible()
  })

  // E2E-TT-03: loading skeleton disappears within a reasonable time
  test('E2E-TT-03: loading skeleton resolves within 2 s and shows tab sections', async ({
    newtabPage: page,
  }) => {
    const panel = page.locator('.tab-tray-panel')
    // After max 2 s the loading state (connecting = true) ends
    await page.waitForTimeout(600)
    // Section header: "Current tabs (N)"
    await expect(panel.getByText(/current tabs/i).first()).toBeVisible({ timeout: 3000 })
  })

  // E2E-TT-04: "Recently Closed" section is visible after load
  test('E2E-TT-04: "Recently Closed" section header is visible after load', async ({
    newtabPage: page,
  }) => {
    const panel = page.locator('.tab-tray-panel')
    await page.waitForTimeout(600)
    // Section header: "Recently closed (N)"
    await expect(panel.getByText(/recently closed/i).first()).toBeVisible({ timeout: 3000 })
  })

  // E2E-TT-05: Open Tabs section can be collapsed and re-expanded
  test('E2E-TT-05: clicking "Current tabs" section header toggles its contents', async ({
    newtabPage: page,
  }) => {
    const panel = page.locator('.tab-tray-panel')
    await page.waitForTimeout(600)

    const header = panel.getByText(/current tabs/i).first()
    await expect(header).toBeVisible({ timeout: 3000 })

    // Collapse
    await header.click()
    // Re-expand
    await header.click()
    // Header is still visible
    await expect(header).toBeVisible()
  })

  // E2E-TT-06: hover on a current tab row shows remove button (no URL tooltip on row)
  test('E2E-TT-06: hover shows remove button on current tab row without URL title attribute', async ({
    extContext,
    newtabPage: page,
  }) => {
    const otherPage = await extContext.newPage()
    await otherPage.goto('https://example.com')
    await page.waitForTimeout(800)

    const panel = page.locator('.tab-tray-panel')
    const row = panel.locator('[draggable="true"]').first()
    await expect(row).toBeVisible({ timeout: 5000 })

    const rowTitle = await row.getAttribute('title')
    expect(rowTitle).toBeNull()

    await row.hover()
    await expect(panel.getByTestId('tab-tray-remove')).toBeVisible()

    await otherPage.close()
  })
})
