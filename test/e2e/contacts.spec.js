const path = require('path')
const { sharedHelper, moduleHelper, fixturePath } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { loginAsTestUser, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { waitForListReady, clickReady } = sharedHelper('ready')
const {
  openContacts,
  createContact,
  listReadyOptions,
} = require('./helpers/contacts')


test.describe('Desktop contacts', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_0/E2E_PASSWORD_0 (or E2E_LOGIN/E2E_PASSWORD) in .env.e2e')

  test('opens first contact from the list', async ({ page }) => {
    test.setTimeout(120000)

    await loginAsTestUser(page)
    await openContacts(page)
    await attachScreenshot(page, 'contacts-01-list')

    const items = page.getByTestId('contacts-item')
    const count = await items.count()

    await step(`Inspect contacts list (found ${count})`, async () => {
      if (count === 0) {
        console.log('  → Contacts list is empty')
        await attachScreenshot(page, 'contacts-02-empty')
        return
      }
      const name = (
        await items.first().locator('.name').first().innerText().catch(() => '')
      ).trim()
      console.log(`  → First contact: ${name || '(unnamed)'}`)
      await attachScreenshot(page, 'contacts-02-list')
    })

    test.skip(
      count === 0,
      'Contacts list is empty — add at least one contact for this smoke'
    )

    await step('Open first contact', async () => {
      await clickReady(items.first())
      await expect(page.getByTestId('contacts-view')).toBeVisible({
        timeout: 30000,
      })
      await expect(page.getByTestId('contacts-view-name')).toBeVisible({
        timeout: 15000,
      })
      const name = (
        await page.getByTestId('contacts-view-name').innerText()
      ).trim()
      console.log(`  → Opened contact card: ${name}`)
      await attachScreenshot(page, 'contacts-03-view')
    })

    await step('List still present (desktop split pane)', async () => {
      await expect(page.getByTestId('contacts-list')).toBeVisible()
      await waitForListReady(page, listReadyOptions)
    })
  })

  test('lists contacts and creates a contact', async ({ page }) => {
    test.setTimeout(180000)

    const stamp = Date.now()
    const name = `E2E Contact ${stamp}`
    const email = `e2e.contact.${stamp}@example.com`

    await loginAsTestUser(page)
    await openContacts(page)
    await attachScreenshot(page, 'contacts-create-01-list')

    await createContact(page, { name, email })

    await step('Expect new contact in list', async () => {
      const item = page
        .getByTestId('contacts-item')
        .filter({ hasText: name })
        .first()
      await expect(item).toBeVisible({ timeout: 30000 })
      console.log(`  → Contact created: ${name}`)
      await attachScreenshot(page, 'contacts-create-02-created')
    })
  })
})
