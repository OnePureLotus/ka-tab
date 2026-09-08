import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from './fixtures'

test.describe('Settings – Sync file export and import', () => {
  test('E2E-SB-01: "Export to file" downloads a JSON file', async ({ optionsPage: page }) => {
    await page.getByText('Sync', { exact: true }).first().click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to file' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/katab-sync.*\.json/)
  })

  test('E2E-SB-02: exported JSON structure contains schemaVersion', async ({
    optionsPage: page,
  }) => {
    await page.getByText('Sync', { exact: true }).first().click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to file' }).click()

    const download = await downloadPromise
    const tempPath = path.join('/tmp', download.suggestedFilename())
    await download.saveAs(tempPath)

    const content = fs.readFileSync(tempPath, 'utf-8')
    const backup = JSON.parse(content)

    expect(backup).toHaveProperty('schemaVersion', 1)
    expect(backup).toHaveProperty('collections')
    expect(backup).toHaveProperty('settings')
    expect(Array.isArray(backup.collections)).toBeTruthy()

    fs.unlinkSync(tempPath)
  })

  test('E2E-SB-03: "Import from file" button is present and clickable', async ({
    optionsPage: page,
  }) => {
    await page.getByText('Sync', { exact: true }).first().click()

    const importButton = page.getByRole('button', { name: 'Import from file' })
    await expect(importButton).toBeVisible()
    await expect(importButton).toBeEnabled()
  })

  test.skip('E2E-SB-04: valid backup JSON can be imported', async () => {
    // NOTE: The import uses a dynamically created (non-DOM) file input via input.click(),
    // which opens a native OS file picker that Playwright cannot interact with.
    // This test is skipped - use integration tests to verify import logic instead.
  })

  test('E2E-SB-05: export then parse produces valid snapshot', async ({ optionsPage: page }) => {
    await page.getByText('Sync', { exact: true }).first().click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to file' }).click()
    const download = await downloadPromise

    const tempPath = path.join('/tmp', `backup-test-${Date.now()}.json`)
    await download.saveAs(tempPath)

    const content = fs.readFileSync(tempPath, 'utf-8')
    const backup = JSON.parse(content)

    expect(backup.schemaVersion).toBe(1)
    expect(backup.collections).toBeDefined()
    expect(backup.settings).toBeDefined()

    fs.unlinkSync(tempPath)
  })
})
