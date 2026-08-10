const path = require('path')
const { sharedHelper, moduleHelper, fixturePath } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { gotoLoggedIn, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { clickReady, waitForListReady } = sharedHelper('ready')
const {
  openContacts,
  listReadyOptions,
  createContactViaFab,
  openContactByName,
  deleteOpenedContact,
  selectContactCheckbox,
  createGroupViaFab,
  openGroupFromDrawer,
  fillContactsField,
  confirmOkIfVisible,
  searchContacts,
} = require('./helpers/contacts')
const {
  closeComposeWithoutSending,
  expectComposeOpen,
} = moduleHelper('MailWebclient', 'mail')


test.describe('Desktop contacts select and groups', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_0/E2E_PASSWORD_0 (or E2E_LOGIN/E2E_PASSWORD) in .env.e2e')

  test('multi-select bulk deletes contacts', async ({ page }) => {
    test.setTimeout(T(240000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const nameA = `E2E Sel A ${stamp}`
    const nameB = `E2E Sel B ${stamp}`
    const emailA = `e2e.sel.a.${stamp}@example.com`
    const emailB = `e2e.sel.b.${stamp}@example.com`

    await step('Create two contacts', async () => {
      await createContactViaFab(page, { fullName: nameA, email: emailA })
      await createContactViaFab(page, { fullName: nameB, email: emailB })
      // createContactViaFab may fall back to a search filter to find the new
      // contact on a large list — clear it so both contacts are visible together.
      await searchContacts(page, stamp.toString())
    })

    await step('Check both contacts', async () => {
      await selectContactCheckbox(
        page,
        page.getByTestId('contacts-item').filter({ hasText: nameA }).first()
      )
      await selectContactCheckbox(
        page,
        page.getByTestId('contacts-item').filter({ hasText: nameB }).first()
      )
      await attachScreenshot(page, 'contacts-select-01')
    })

    await step('Bulk delete → confirm', async () => {
      await clickReady(page.getByTestId('contacts-menu-delete'))
      await confirmOkIfVisible(page, 5000)
      await waitForListReady(page, listReadyOptions)
      await expect(
        page.getByTestId('contacts-item').filter({ hasText: nameA })
      ).toHaveCount(0, { timeout: T(30000) })
      await expect(
        page.getByTestId('contacts-item').filter({ hasText: nameB })
      ).toHaveCount(0, { timeout: T(30000) })
      console.log('  → Both contacts deleted')
      await attachScreenshot(page, 'contacts-select-02-deleted')
    })
  })

  test('multi-select opens compose to selected contacts', async ({ page }) => {
    test.setTimeout(T(240000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const nameA = `E2E Mail A ${stamp}`
    const nameB = `E2E Mail B ${stamp}`
    const emailA = `e2e.mail.a.${stamp}@example.com`
    const emailB = `e2e.mail.b.${stamp}@example.com`

    await step('Create two contacts with email', async () => {
      await createContactViaFab(page, { fullName: nameA, email: emailA })
      await createContactViaFab(page, { fullName: nameB, email: emailB })
      // createContactViaFab may fall back to a search filter to find the new
      // contact on a large list — clear it so both contacts are visible together.
      await searchContacts(page, stamp.toString())
    })

    await step('Select both → look for mail action', async () => {
      await selectContactCheckbox(
        page,
        page.getByTestId('contacts-item').filter({ hasText: nameA }).first()
      )
      await selectContactCheckbox(
        page,
        page.getByTestId('contacts-item').filter({ hasText: nameB }).first()
      )

      const sendBtn = page.getByTestId('contacts-select-email')
      test.skip(
        (await sendBtn.count()) === 0 ||
          !(await sendBtn.isVisible().catch(() => false)),
        'Multi-select email/compose toolbar action not available on desktop'
      )
      await clickReady(sendBtn)
      await expectComposeOpen(page)
      await attachScreenshot(page, 'contacts-select-compose-01')
    })

    await step('Close compose without sending', async () => {
      if (await page.getByTestId('mail-compose').isVisible().catch(() => false)) {
        await closeComposeWithoutSending(page)
      }
    })

    await step('Cleanup', async () => {
      await openContacts(page)
      for (const name of [nameA, nameB]) {
        const item = page.getByTestId('contacts-item').filter({ hasText: name })
        if ((await item.count()) > 0) {
          await openContactByName(page, name)
          await deleteOpenedContact(page, name)
        }
      }
    })
  })

  test('assigns contact to group via toolbar', async ({ page }) => {
    test.setTimeout(T(300000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const groupName = `E2E Grp ${stamp}`
    const fullName = `E2E InGrp ${stamp}`
    const email = `e2e.ingrp.${stamp}@example.com`

    await step('Create group', async () => {
      await createGroupViaFab(page, groupName)
      await expect(
        page.getByTestId('contacts-group-item').filter({ hasText: groupName })
      ).toBeVisible({ timeout: T(45000) })
    })

    await step('Create contact and assign to group', async () => {
      // Reset to Personal storage before creating — after "Create group" the
      // active view may still be scoped to the just-created group. The old
      // guard used .isVisible() (no polling, an instant one-shot check — see
      // memory on confirmOkIfVisible's identical bug), which could resolve
      // false and skip the reset before the sidebar finished re-rendering,
      // leaving the new contact scoped/created inside the group's own view
      // instead of Personal. Not .first() either — the sidebar lists "All"
      // before "Personal" in both apps (see bug_contacts_storage_first_wrong).
      const personal = page
        .getByTestId('contacts-storage-item')
        .filter({ hasText: /personal/i })
        .first()
      await clickReady(personal)
      await waitForListReady(page, listReadyOptions)
      await createContactViaFab(page, { fullName, email })
      await selectContactCheckbox(
        page,
        page.getByTestId('contacts-item').filter({ hasText: fullName }).first()
      )
      const assign = page.getByTestId('contacts-assign-group')
      test.skip(
        (await assign.count()) === 0 ||
          !(await assign.isVisible().catch(() => false)),
        'Assign to group toolbar not available'
      )
      await clickReady(assign)
      const groupOpt = page
        .locator('.dropdown .item, .dropdown_content .item')
        .filter({ hasText: groupName })
        .first()
      await expect(groupOpt).toBeVisible({ timeout: T(15000) })
      await clickReady(groupOpt)
      console.log(`  → Assigned ${fullName} → ${groupName}`)
      await attachScreenshot(page, 'contacts-group-assign-01')
    })

    await step('Open group → contact is listed', async () => {
      await openGroupFromDrawer(page, groupName)
      await expect(
        page.getByTestId('contacts-item').filter({ hasText: fullName }).first()
      ).toBeVisible({ timeout: T(30000) })
      await attachScreenshot(page, 'contacts-group-assign-02-list')
    })

    await step('Cleanup: delete group and contact', async () => {
      const del = page.getByTestId('contacts-group-view-delete')
      if (await del.isVisible().catch(() => false)) {
        await clickReady(del)
        await confirmOkIfVisible(page, 5000)
      }
      await openContacts(page)
      const item = page
        .getByTestId('contacts-item')
        .filter({ hasText: fullName })
      if ((await item.count()) > 0) {
        await openContactByName(page, fullName)
        await deleteOpenedContact(page, fullName)
      }
    })
  })

  test('renames a group', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const groupName = `E2E Ren ${stamp}`
    const renamed = `E2E Renamed ${stamp}`

    await step('Create group', async () => {
      await createGroupViaFab(page, groupName)
    })

    await step('Edit group name', async () => {
      await openGroupFromDrawer(page, groupName)
      const editBtn = page.getByTestId('contacts-group-view-edit')
      test.skip(
        (await editBtn.count()) === 0 ||
          !(await editBtn.isVisible().catch(() => false)),
        'Group rename UI not exposed with test ids on desktop'
      )
      await clickReady(editBtn)
      await expect(page.getByTestId('contacts-group-edit')).toBeVisible({
        timeout: T(30000),
      })
      await fillContactsField(page, 'contacts-group-edit-name', renamed)
      await clickReady(page.getByTestId('contacts-group-edit-save'))
      await expect(
        page.getByTestId('contacts-group-item').filter({ hasText: renamed })
      ).toBeVisible({ timeout: T(45000) })
      console.log(`  → Renamed group: ${groupName} → ${renamed}`)
      await attachScreenshot(page, 'contacts-group-rename-01')
    })

    await step('Cleanup: delete renamed group', async () => {
      await openGroupFromDrawer(page, renamed)
      const del = page.getByTestId('contacts-group-view-delete')
      if (await del.isVisible().catch(() => false)) {
        await clickReady(del)
        await confirmOkIfVisible(page, 5000)
      }
    })
  })
})
