const path = require('path')
const { sharedHelper, moduleHelper } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const {
  gotoLoggedIn,
  openLoggedInPage,
  step,
  attachScreenshot,
  hasCredentials,
  hasSecondaryCredentials,
  getSecondaryCredentials,
  fieldControl,
} = sharedHelper('login')
const { clickReady } = sharedHelper('ready')
const {
  openContacts,
  openContactsStorage,
  createContactViaFab,
  searchContacts,
  openContactByName,
  deleteOpenedContact,
} = moduleHelper('ContactsWebclient', 'contacts')

test.describe('Desktop contacts multi-user share', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')
  test.skip(
    !hasSecondaryCredentials(),
    'Set E2E_LOGIN_SECONDARY and E2E_PASSWORD_SECONDARY in .env.e2e'
  )

  test('PRIMARY shares personal addressbook; SECONDARY sees contact', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(T(360000))

    const stamp = Date.now()
    const fullName = `E2E ShareAB ${stamp}`
    const email = `e2e.shareab.${stamp}@example.com`
    const secondaryEmail = getSecondaryCredentials().login

    await gotoLoggedIn(page)
    await openContacts(page)
    await openContactsStorage(page, 'personal')

    await step('Create contact as PRIMARY', async () => {
      await createContactViaFab(page, { fullName, email })
      await attachScreenshot(page, 'contacts-share-ab-01-created')
    })

    await step('Share personal addressbook with SECONDARY', async () => {
      const shareControl = page.getByTestId('contacts-addressbook-share').first()
      test.skip(
        (await shareControl.count()) === 0 ||
          !(await shareControl.isVisible().catch(() => false)),
        'Addressbook share control not available (SharedContacts module off)'
      )
      await clickReady(shareControl)
      const dialog = page.getByTestId('contacts-share-dialog')
      await expect(dialog).toBeVisible({ timeout: T(15000) })
      const recipient = fieldControl(page, 'contacts-share-recipient')
      await recipient.fill(secondaryEmail)
      const suggestion = page
        .locator('.ui-autocomplete .ui-menu-item')
        .filter({
          hasText: new RegExp(
            secondaryEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'i'
          ),
        })
        .first()
      const picked = await suggestion
        .waitFor({ state: 'visible', timeout: T(30000) })
        .then(() => true)
        .catch(() => false)
      if (!picked) {
        throw new Error(
          `Share autocomplete has no teammate "${secondaryEmail}". ` +
            `E2E_LOGIN_SECONDARY must be on the same tenant as PRIMARY.`
        )
      }
      await clickReady(suggestion)
      await clickReady(page.getByTestId('contacts-share-save'))
      await expect(dialog).toBeHidden({ timeout: T(60000) })
      console.log(`  → Addressbook shared with ${secondaryEmail}`)
    })

    const secondary = await openLoggedInPage(
      browser,
      getSecondaryCredentials(),
      { baseURL }
    )
    try {
      await step('SECONDARY finds shared contact', async () => {
        await openContacts(secondary.page)
        await searchContacts(secondary.page, fullName)
        const item = secondary.page
          .getByTestId('contacts-item')
          .filter({ hasText: fullName })
          .first()
        await expect(item).toBeVisible({ timeout: T(120000) })
        console.log(`  → SECONDARY sees: ${fullName}`)
        await attachScreenshot(secondary.page, 'contacts-share-ab-02-secondary')
      })
    } finally {
      await secondary.context.close()
    }

    await step('Cleanup: delete contact as PRIMARY', async () => {
      await openContacts(page)
      await openContactsStorage(page, 'personal')
      await openContactByName(page, fullName)
      await deleteOpenedContact(page, fullName)
    })
  })
})
