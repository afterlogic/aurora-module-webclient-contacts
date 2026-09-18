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
  getPrimaryCredentials,
  getSecondaryCredentials,
  fieldControl,
} = sharedHelper('login')
const { clickReady, confirmOkIfVisible } = sharedHelper('ready')
const {
  openContacts,
  openContactsStorage,
  openSharedAddressBookByOwner,
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
    const primaryEmail = getPrimaryCredentials().login
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
      const sharesLoaded = page.waitForResponse(
        async (res) => {
          if (
            res.request().method() !== 'POST' ||
            !/\/Api\/?(\?|$)/.test(res.url())
          ) {
            return false
          }
          const post = res.request().postData() || ''
          return /GetSharesForAddressbook/i.test(post)
        },
        { timeout: T(30000) }
      )
      await clickReady(shareControl)
      const dialog = page.getByTestId('contacts-share-dialog')
      await expect(dialog).toBeVisible({ timeout: T(15000) })
      await sharesLoaded.catch(() => null)

      const emailRe = new RegExp(
        secondaryEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      )
      // Shares load async — initial "No shares yet" is stale until GetSharesForAddressbook returns.
      await expect(
        dialog.locator('.item_share, .row_shares_list .hint').first()
      ).toBeVisible({ timeout: T(15000) })

      const existingShare = dialog
        .locator('.item_share')
        .filter({ hasText: emailRe })
        .first()

      async function dismissAlreadyShared() {
        // Prefer Cancel — `.close` is first in DOM but often not "visible" to Playwright.
        const cancel = dialog.locator(
          '[data-test-id="contacts-share-cancel"], .buttons .secondary_button'
        ).first()
        await clickReady(cancel)
        // Filled recipient counts as dirty → discard confirm.
        await confirmOkIfVisible(page, 5000)
        await expect(dialog).toBeHidden({ timeout: T(15000) })
        console.log(`  → Addressbook already shared with ${secondaryEmail}`)
      }

      if (await existingShare.isVisible().catch(() => false)) {
        await dismissAlreadyShared()
        return
      }

      const recipient = fieldControl(page, 'contacts-share-recipient')
      await recipient.fill(secondaryEmail)
      const suggestion = page
        .locator('.ui-autocomplete .ui-menu-item')
        .filter({ hasText: emailRe })
        .first()
      const picked = await suggestion
        .waitFor({ state: 'visible', timeout: T(30000) })
        .then(() => true)
        .catch(() => false)
      if (!picked) {
        if (await existingShare.isVisible().catch(() => false)) {
          await dismissAlreadyShared()
          return
        }
        throw new Error(
          `Share autocomplete has no teammate "${secondaryEmail}". ` +
            `E2E_LOGIN_SECONDARY must be on the same tenant as PRIMARY.`
        )
      }
      await clickReady(suggestion)

      // Autocomplete only fills the field; + / access adds the teammate to shares.
      const access = dialog
        .locator(
          '[data-test-id="contacts-share-access"], .new_share_access_select, .row_new_share .control'
        )
        .first()
      await clickReady(access)
      // First access option is Read (same order as SharedContacts accessList).
      const readOption = dialog
        .locator(
          '.new_share_access_select .dropdown_content .item, .dropdown_content .item'
        )
        .first()
      await expect(readOption).toBeVisible({ timeout: T(5000) })
      await clickReady(readOption)

      await expect(existingShare).toBeVisible({ timeout: T(15000) })

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
        // Shared personal AB appears as a custom storage, not in Personal/All search scope.
        await openSharedAddressBookByOwner(secondary.page, primaryEmail)
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
