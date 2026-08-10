const path = require('path')
const { sharedHelper, moduleHelper, fixturePath } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { loginAsTestUser, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { clickReady, waitForListReady } = sharedHelper('ready')
const {
  openContacts,
  listReadyOptions,
  createContactViaFab,
  openContactByName,
  deleteOpenedContact,
} = require('./helpers/contacts')
const { closeComposeWithoutSending } = moduleHelper('MailWebclient', 'mail')


test.describe('Desktop contacts team and send', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_0/E2E_PASSWORD_0 (or E2E_LOGIN/E2E_PASSWORD) in .env.e2e')

  test('opens Team storage when available (read-only browse)', async ({
    page,
  }) => {
    test.setTimeout(T(120000))
    await loginAsTestUser(page)
    await openContacts(page)

    await step('Select Team storage from sidebar', async () => {
      const team = page
        .getByTestId('contacts-storage-item')
        .filter({ hasText: /team/i })
        .first()
      test.skip((await team.count()) === 0, 'No Team storage on this stand')
      await clickReady(team)
      await expect(page.getByTestId('contacts-list')).toBeVisible({
        timeout: T(30000),
      })
      await waitForListReady(page, listReadyOptions)
      console.log('  → Team storage open')
      await attachScreenshot(page, 'contacts-team-01')
    })

    await step('Open first team contact if any', async () => {
      const items = page.getByTestId('contacts-item')
      if ((await items.count()) === 0) {
        console.log('  → Team storage empty')
        return
      }
      await clickReady(items.first())
      await expect(page.getByTestId('contacts-view')).toBeVisible({
        timeout: T(30000),
      })
      // Team contacts typically cannot be deleted.
      const del = page.getByTestId('contacts-menu-delete')
      if (await del.isVisible().catch(() => false)) {
        console.log('  → Delete visible on team contact (unexpected but noted)')
      } else {
        console.log('  → Team contact view (no delete)')
      }
      await attachScreenshot(page, 'contacts-team-02-view')
    })
  })

  test('Send / compose from contact email when available', async ({ page }) => {
    test.setTimeout(T(180000))
    await loginAsTestUser(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Send ${stamp}`
    const email = `e2e.send.${stamp}@example.com`

    await step('Create contact', async () => {
      await createContactViaFab(page, { fullName, email })
      await openContactByName(page, fullName)
    })

    await step('Compose via email link (desktop Send equivalent)', async () => {
      // Desktop has no contacts-menu-send; use email compose link.
      const mailBtn = page.getByTestId('contacts-view-email-compose').first()
      test.skip(
        (await mailBtn.count()) === 0,
        'Send/compose action not in contact view'
      )
      await clickReady(mailBtn)
      await expect(page.getByTestId('mail-compose')).toBeVisible({
        timeout: T(30000),
      })
      console.log('  → Compose opened from contact')
      await attachScreenshot(page, 'contacts-send-compose')
      await closeComposeWithoutSending(page)
    })

    await step('Cleanup', async () => {
      if (await page.getByTestId('contacts-view').isVisible().catch(() => false)) {
        await deleteOpenedContact(page, fullName)
        return
      }
      await openContacts(page)
      await openContactByName(page, fullName)
      await deleteOpenedContact(page, fullName)
    })
  })
})
