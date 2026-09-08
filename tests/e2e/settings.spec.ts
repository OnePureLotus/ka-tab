/**
 * E2E tests – Settings (Options Page)
 *
 * Each test uses the `optionsPage` fixture which:
 *   1. Clears all Chrome storage (so defaults apply)
 *   2. Opens options.html fresh
 *
 * Context notes:
 *  - Default theme is "system" (no theme-light / theme-dark on <html>)
 *  - Default accent is #4f46e5 (Indigo)
 *  - Default openCollectionMode is "tab-group"
 *  - blockedDomains defaults to []
 *  - Nav sections: "Appearance" (default), "Data & Backup", "Privacy"
 */
import { expect, test } from './fixtures'

test.describe('Settings – Appearance section', () => {
  // E2E-SE-01
  test('E2E-SE-01: options page loads showing "Appearance & Behavior" section by default', async ({
    optionsPage: page,
  }) => {
    await expect(page.getByText('Appearance & Behavior')).toBeVisible()
  })

  // E2E-SE-02
  test('E2E-SE-02: Theme section shows System / Light / Dark options', async ({
    optionsPage: page,
  }) => {
    await expect(page.getByRole('button', { name: 'System' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Light' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible()
  })

  // E2E-SE-03: default state – no theme class on <html>
  test('E2E-SE-03: default (system) theme has no theme-light or theme-dark class on <html>', async ({
    optionsPage: page,
  }) => {
    const html = page.locator('html')
    await expect(html).not.toHaveClass(/theme-dark/)
    await expect(html).not.toHaveClass(/theme-light/)
  })

  // E2E-SE-04
  test('E2E-SE-04: clicking Dark adds theme-dark class to <html>', async ({
    optionsPage: page,
  }) => {
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/theme-dark/)
  })

  // E2E-SE-05
  test('E2E-SE-05: clicking Light adds theme-light class to <html>', async ({
    optionsPage: page,
  }) => {
    await page.getByRole('button', { name: 'Light' }).click()
    await expect(page.locator('html')).toHaveClass(/theme-light/)
  })

  // E2E-SE-06: System resets the theme
  test('E2E-SE-06: after setting Dark, clicking System removes theme-dark class', async ({
    optionsPage: page,
  }) => {
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/theme-dark/)

    await page.getByRole('button', { name: 'System' }).click()
    await expect(page.locator('html')).not.toHaveClass(/theme-dark/)
    await expect(page.locator('html')).not.toHaveClass(/theme-light/)
  })

  // E2E-SE-07: Accent color preset chips are visible
  test('E2E-SE-07: accent color preset buttons (Indigo, Green, Blue…) are visible', async ({
    optionsPage: page,
  }) => {
    for (const name of ['Indigo', 'Green', 'Blue', 'Pink', 'Orange', 'Teal']) {
      await expect(page.getByTitle(new RegExp(name, 'i')).first()).toBeVisible()
    }
  })

  // E2E-SE-08: clicking a preset updates the displayed hex
  test('E2E-SE-08: clicking the Green preset updates the displayed hex value', async ({
    optionsPage: page,
  }) => {
    await page.getByTitle(/Green/i).first().click()
    // Options page shows "Custom: #XXXXXX" label for current accent
    await expect(page.getByText(/Custom:/i)).toContainText('#059669'.toUpperCase())
  })

  // E2E-SE-09: Open Collection mode section is visible
  test('E2E-SE-09: Open Collection section shows Tab Group and New Window options', async ({
    optionsPage: page,
  }) => {
    await expect(page.getByText('Open Collection')).toBeVisible()
    await expect(page.getByText('Tab Group')).toBeVisible()
    await expect(page.getByText('New Window')).toBeVisible()
  })

  test('E2E-SE-10: selecting "New Window" mode does not throw an error', async ({
    optionsPage: page,
  }) => {
    const option = page.getByText('New Window').first()
    await option.click()
    await expect(option).toBeVisible()
  })
})

test.describe('Settings – Floating Button / Blocked Domains', () => {
  // E2E-SE-11: Floating Save Button section is visible
  test('E2E-SE-11: "Floating Save Button" section is visible', async ({ optionsPage: page }) => {
    await expect(page.getByText('Floating Save Button')).toBeVisible()
    await expect(page.getByPlaceholder('docs.google.com')).toBeVisible()
  })

  // E2E-SE-12: typing a domain and pressing Enter creates a chip
  test('E2E-SE-12: typing a domain and pressing Enter adds a blocked-domain chip', async ({
    optionsPage: page,
  }) => {
    const input = page.getByPlaceholder('docs.google.com')
    await input.fill('example.com')
    await input.press('Enter')
    await expect(page.getByText('example.com')).toBeVisible()
  })

  // E2E-SE-13: adding then removing a domain chip
  test('E2E-SE-13: removing a blocked domain chip deletes it from the list', async ({
    optionsPage: page,
  }) => {
    const input = page.getByPlaceholder('docs.google.com')
    await input.fill('remove-me.com')
    await input.press('Enter')
    await expect(page.getByText('remove-me.com')).toBeVisible()

    // The chip is a <span> containing the domain text + a × button
    const chip = page.locator('span').filter({ hasText: 'remove-me.com' }).first()
    await chip.getByRole('button').click()

    await expect(page.getByText('remove-me.com')).not.toBeVisible()
  })

  // E2E-SE-14: input clears after pressing Enter
  test('E2E-SE-14: domain input clears after a domain is added', async ({ optionsPage: page }) => {
    const input = page.getByPlaceholder('docs.google.com')
    await input.fill('cleared.com')
    await input.press('Enter')
    await expect(input).toHaveValue('')
  })
})

test.describe('Settings – Data & Backup section', () => {
  // E2E-SE-15: clicking "Data & Backup" nav item shows the section
  test('E2E-SE-15: clicking "Data & Backup" nav item shows the data section', async ({
    optionsPage: page,
  }) => {
    // Nav sidebar has "Data & Backup"; the section title repeats it
    await page.getByText('Data & Backup').first().click()
    // The section heading (h1) should appear
    await expect(
      page.getByRole('heading', { name: /data/i }).or(page.getByText('Data & Backup').nth(1)),
    ).toBeVisible()
  })

  test('E2E-SE-16: Export Backup button is visible in the Data section', async ({
    optionsPage: page,
  }) => {
    await page.getByText('Data & Backup').first().click()
    await expect(page.getByRole('button', { name: 'Export Backup' })).toBeVisible()
  })

  test('E2E-SE-17: Import Backup button is visible in the Data section', async ({
    optionsPage: page,
  }) => {
    await page.getByText('Data & Backup').first().click()
    await expect(page.getByRole('button', { name: 'Import Backup' })).toBeVisible()
  })
})

test.describe('Settings – Privacy section', () => {
  // E2E-SE-18: Privacy section shows sync info
  test('E2E-SE-18: Privacy section describes local storage and WebDAV', async ({
    optionsPage: page,
  }) => {
    await page.getByText('Privacy').first().click()
    await expect(page.getByText(/stored locally in your browser/i)).toBeVisible()
  })
})
