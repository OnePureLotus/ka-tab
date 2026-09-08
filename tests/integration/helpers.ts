/**
 * Shared helpers for KaTab integration tests.
 * Builds on the same patterns as e2e/helpers.ts but adds multi-step utilities.
 */
import type { Locator, Page } from '@playwright/test'

// ─── Board readiness ──────────────────────────────────────────────────────────

export async function waitForBoardReady(page: Page) {
  await page.waitForFunction(
    () => {
      const panel = document.querySelector('.collections-panel')
      if (!panel) return false
      return (
        panel.textContent?.includes('No collections in this board') ||
        panel.querySelector('[data-collection-id]') !== null ||
        panel.textContent?.includes('Create Collection') === true
      )
    },
    { timeout: 10_000 },
  )
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function openCreateModal(page: Page) {
  await waitForBoardReady(page)
  const emptyBtn = page.getByRole('button', { name: 'Create Collection' }).first()
  if (await emptyBtn.isVisible()) {
    await emptyBtn.click()
  } else {
    await page
      .locator('.collections-panel')
      .getByRole('button', { name: 'Create Collection' })
      .click()
  }
  await page.getByText('New Collection').waitFor({ state: 'visible' })
}

export async function createCollectionViaUI(page: Page, name: string): Promise<Locator> {
  await openCreateModal(page)
  await page.getByPlaceholder(/e\.g\. Work/i).fill(name)
  await page.getByRole('button', { name: /^Create$/ }).click()
  const card = page.locator('[data-collection-id]').filter({ hasText: name })
  await card.waitFor({ state: 'visible', timeout: 5_000 })
  const id = await card.getAttribute('data-collection-id')
  return page.locator(`[data-collection-id="${id}"]`)
}

export async function openCardMenu(card: Locator) {
  await card.getByTitle('More options').click()
}

export async function deleteCollection(page: Page, card: Locator) {
  page.once('dialog', (d) => d.accept())
  await openCardMenu(card)
  await page.getByText('Delete', { exact: true }).click()
}

export async function renameCollectionViaMenu(page: Page, card: Locator, newName: string) {
  await openCardMenu(card)
  await page.getByText('Rename').click()
  const input = page.getByPlaceholder(/rename/i).or(page.locator('input[value]').last())
  await input.clear()
  await input.fill(newName)
  await page.keyboard.press('Enter')
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export async function addSiteViaUI(page: Page, card: Locator, url: string) {
  // Click "+ Add site" button to open modal
  await card.getByText('+ Add site').click()
  // Fill in the modal's URL input
  await page.getByPlaceholder('https://platform.openai.com/docs').fill(url)
  // Click the "Add site" button in modal
  await page.getByRole('button', { name: /^Add site$/ }).click()
  // Wait for modal to close
  await page
    .getByPlaceholder('https://platform.openai.com/docs')
    .waitFor({ state: 'hidden', timeout: 5_000 })
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function openNotesPanel(page: Page) {
  const panel = page.locator('.notes-panel')
  if (!(await panel.isVisible())) {
    await page
      .getByTitle(/notes/i)
      .or(page.getByRole('button', { name: /notes/i }))
      .click()
    await panel.waitFor({ state: 'visible' })
  }
}

export async function addNoteViaUI(page: Page, content: string) {
  await openNotesPanel(page)
  const textarea = page.locator('.notes-panel textarea')
  await textarea.fill(content)
  await page.keyboard.press('Control+Enter')
  await page
    .locator('.notes-panel')
    .getByText(content)
    .waitFor({ state: 'visible', timeout: 5_000 })
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function setOpenModeViaOptions(optionsPage: Page, mode: 'tab-group' | 'new-window') {
  const label = mode === 'tab-group' ? /tab group/i : /new window/i
  await optionsPage.getByText(label).click()
  // Wait for the selection to be reflected
  await optionsPage.waitForTimeout(300)
}
