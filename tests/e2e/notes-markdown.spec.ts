import { test, expect } from './fixtures'

const panel = (page: import('@playwright/test').Page) => page.locator('.notes-panel')

async function saveNote(page: import('@playwright/test').Page, text: string) {
  await panel(page).getByPlaceholder(/Capture an idea/i).fill(text)
  await panel(page).getByRole('button', { name: /^Save$/ }).click()
  await page.waitForTimeout(300)
}

// Note cards are the divs with inline border-radius style inside the notes panel
const noteCards = (page: import('@playwright/test').Page) =>
  panel(page).locator('div').filter({ has: panel(page).locator('[title="Delete note"]') }).or(
    panel(page).locator('div[style*="border-radius: 8px"]').filter({ has: panel(page).locator('div[style*="line-height"]') })
  )

test.describe('Notes – Markdown Rendering', () => {
  test('E2E-NM-01: italic text (*text*) renders as <em>', async ({ newtabPage: page }) => {
    await saveNote(page, 'This is *italic* text')

    // Find the rendered markdown area in notes panel
    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const italic = noteContent.locator('em, i')
    await expect(italic).toHaveText('italic')
  })

  test('E2E-NM-02: links [text](url) render as clickable anchors', async ({ newtabPage: page }) => {
    await saveNote(page, 'Check [GitHub](https://github.com)')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const link = noteContent.locator('a[href="https://github.com"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveText('GitHub')
  })

  test('E2E-NM-03: inline code with backticks renders as <code>', async ({ newtabPage: page }) => {
    await saveNote(page, 'Run `npm install` command')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const code = noteContent.locator('code')
    await expect(code).toHaveText('npm install')
  })

  test('E2E-NM-04: lists (- item) render as <ul>', async ({ newtabPage: page }) => {
    await saveNote(page, '- Buy milk\n- Read docs\n- Deploy app')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const list = noteContent.locator('ul')
    await expect(list).toBeVisible()
    
    const items = noteContent.locator('li')
    await expect(items).toHaveCount(3)
  })

  test('E2E-NM-05: headings (# h1) render as <h1>', async ({ newtabPage: page }) => {
    await saveNote(page, '# Important Note\nSome content')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const heading = noteContent.locator('h1')
    await expect(heading).toHaveText('Important Note')
  })

  test('E2E-NM-06: bold (**text**) renders as <strong>', async ({ newtabPage: page }) => {
    await saveNote(page, '**Bold text** here')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const bold = noteContent.locator('strong')
    await expect(bold).toHaveText('Bold text')
  })

  test('E2E-NM-07: strikethrough (~~text~~) renders as <del>', async ({ newtabPage: page }) => {
    await saveNote(page, '~~Cancelled~~ task done')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const strikethrough = noteContent.locator('del, s')
    await expect(strikethrough).toHaveText('Cancelled')
  })

  test('E2E-NM-08: blockquote (> text) renders as <blockquote>', async ({ newtabPage: page }) => {
    await saveNote(page, '> This is a quote')

    const noteContent = panel(page).locator('div[style*="line-height"]').first()
    const quote = noteContent.locator('blockquote')
    await expect(quote).toBeVisible()
  })
})
