const path = require('path')
const { sharedHelper, moduleHelper, fixturePath } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { gotoLoggedIn, step, attachScreenshot, hasCredentials, getComposeTo, fieldControl } = sharedHelper('login')
const { clickReady, waitForListReady, clickNav } = sharedHelper('ready')
const {
  openContacts,
  fillContactsField,
  listReadyOptions,
  createContactViaFab,
  openContactByName,
  deleteOpenedContact,
  clearContactsSearch,
  openContactsStorage,
} = require('./helpers/contacts')
const {
  closeComposeWithoutSending,
  expectComposeOpen,
  waitForInboxList,
  fillComposeRecipient,
  fillComposeBody,
  sendCompose,
} = moduleHelper('MailWebclient', 'mail')


test.describe('Desktop contacts actions', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_0/E2E_PASSWORD_0 (or E2E_LOGIN/E2E_PASSWORD) in .env.e2e')

  test('shows storages in sidebar and switches storage', async ({ page }) => {
    test.setTimeout(T(120000))
    await gotoLoggedIn(page)
    await openContacts(page)

    await step('Expect contacts storages in sidebar', async () => {
      const storages = page.getByTestId('contacts-storage-item')
      await expect(storages.first()).toBeVisible({ timeout: T(15000) })
      const count = await storages.count()
      console.log(`  → Storages: ${count}`)
      expect(count).toBeGreaterThan(0)
      await attachScreenshot(page, 'contacts-drawer-01')
    })

    await step('Select first storage', async () => {
      const first = page.getByTestId('contacts-storage-item').first()
      const firstName = (await first.innerText()).trim()
      await clickReady(first)
      await expect(page.getByTestId('contacts-list')).toBeVisible({
        timeout: T(30000),
      })
      await waitForListReady(page, listReadyOptions)
      console.log(`  → Selected storage: ${firstName}`)
    })

    await step('Switch to another storage if available', async () => {
      const storages = page.getByTestId('contacts-storage-item')
      const count = await storages.count()
      if (count < 2) {
        console.log('  → Only one storage — skip switch')
        return
      }
      const second = storages.nth(1)
      const secondName = (await second.innerText()).trim()
      await clickReady(second)
      await waitForListReady(page, listReadyOptions)
      console.log(`  → Switched storage: ${secondName}`)
      await attachScreenshot(page, 'contacts-drawer-02-switched')
    })
  })

  test('search filters contacts list', async ({ page }) => {
    test.setTimeout(T(120000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const first = page.getByTestId('contacts-item').first()
    test.skip(
      (await page.getByTestId('contacts-item').count()) === 0,
      'Contacts list is empty'
    )

    const name = (
      await first.locator('.name').first().innerText().catch(() => '')
    ).trim()
    const email = (
      await first.locator('.email').first().innerText().catch(() => '')
    ).trim()
    const query = (name || email).split(/\s+/)[0]
    test.skip(!query, 'No searchable name/email on first contact')

    await step('Type search query', async () => {
      const input = page.getByTestId('contacts-search-input')
      await expect(input).toBeVisible({ timeout: T(15000) })
      await input.fill(query)
      await input.press('Enter')
      console.log(`  → Search query: ${query}`)
      await waitForListReady(page, listReadyOptions)
      await attachScreenshot(page, 'contacts-search-01')
    })

    await step('Expect filtered list contains query', async () => {
      const items = page.getByTestId('contacts-item')
      await expect(items.first()).toBeVisible({ timeout: T(30000) })
      const count = await items.count()
      console.log(`  → Results: ${count}`)
      expect(count).toBeGreaterThan(0)
      await expect(items.first()).toContainText(new RegExp(query, 'i'))
    })
  })

  test('creates a contact via FAB', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Contact ${stamp}`
    const email = `e2e.contact.${stamp}@example.com`

    await step('Create contact', async () => {
      await createContactViaFab(page, { fullName, email })
      console.log(`  → Created contact: ${fullName}`)
      await attachScreenshot(page, 'contacts-create-02-view')
    })

    await step('Find new contact in list', async () => {
      await expect(
        page.getByTestId('contacts-item').filter({ hasText: fullName }).first()
      ).toBeVisible({ timeout: T(30000) })
      await attachScreenshot(page, 'contacts-create-03-list')
    })
  })

  test('edits a contact name', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Edit ${stamp}`
    const renamed = `E2E Edited ${stamp}`
    const email = `e2e.edit.${stamp}@example.com`

    await step('Create contact to edit', async () => {
      await createContactViaFab(page, { fullName, email })
    })

    await step('Select contact in list', async () => {
      await openContactByName(page, fullName)
    })

    await step('Open edit and rename', async () => {
      await clickReady(page.getByTestId('contacts-menu-edit'))
      await expect(page.getByTestId('contacts-edit')).toBeVisible({
        timeout: T(30000),
      })
      await fillContactsField(page, 'contacts-edit-name', renamed)
      await clickReady(page.getByTestId('contacts-edit-save'))
      // createContactViaFab may leave search for the old name; after rename
      // that filter empties the list and hides contacts-view.
      await clearContactsSearch(page)
      await openContactByName(page, renamed)
      await expect(page.getByTestId('contacts-view-name')).toContainText(
        renamed,
        { timeout: T(15000) }
      )
      console.log(`  → Renamed: ${fullName} → ${renamed}`)
      await attachScreenshot(page, 'contacts-edit-01')
    })

    await step('Cleanup: delete edited contact', async () => {
      await deleteOpenedContact(page, renamed)
    })
  })

  test('deletes a contact', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Delete ${stamp}`
    const email = `e2e.delete.${stamp}@example.com`

    await step('Create contact to delete', async () => {
      await createContactViaFab(page, { fullName, email })
    })

    await step('Select contact in list', async () => {
      await openContactByName(page, fullName)
    })

    await step('Delete contact via toolbar', async () => {
      await deleteOpenedContact(page, fullName)
      console.log(`  → Deleted: ${fullName}`)
      await attachScreenshot(page, 'contacts-delete-01')
    })
  })

  test('creates and deletes a group', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const groupName = `E2E Group ${Date.now()}`

    await step('Create group via toolbar', async () => {
      await clickReady(page.getByTestId('contacts-create-group'))
      await expect(page.getByTestId('contacts-group-edit')).toBeVisible({
        timeout: T(30000),
      })
      await fillContactsField(page, 'contacts-group-edit-name', groupName)
      await clickReady(page.getByTestId('contacts-group-edit-save'))
      await expect(
        page.getByTestId('contacts-group-item').filter({ hasText: groupName })
      ).toBeVisible({ timeout: T(45000) })
      console.log(`  → Group created: ${groupName}`)
      await attachScreenshot(page, 'contacts-group-01-created')
    })

    await step('Delete group', async () => {
      await clickReady(
        page.getByTestId('contacts-group-item').filter({ hasText: groupName }).first()
      )
      const del = page.getByTestId('contacts-group-view-delete')
      test.skip(
        (await del.count()) === 0 || !(await del.isVisible().catch(() => false)),
        'Group delete button not visible'
      )
      await clickReady(del)
      // Desktop may delete immediately or via ConfirmPopup.
      const confirmOk = page.getByTestId('confirm-ok')
      if (await confirmOk.isVisible({ timeout: T(3000) }).catch(() => false)) {
        await clickReady(confirmOk)
      }
      await expect(
        page.getByTestId('contacts-group-item').filter({ hasText: groupName })
      ).toHaveCount(0, { timeout: T(30000) })
      console.log(`  → Group deleted: ${groupName}`)
      await attachScreenshot(page, 'contacts-group-02-deleted')
    })
  })

  test('opens compose from contact email action', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Compose ${stamp}`
    const email = `e2e.compose.${stamp}@example.com`

    await step('Create contact with email', async () => {
      await createContactViaFab(page, { fullName, email })
      await openContactByName(page, fullName)
    })

    await step('Tap email compose action on contact card', async () => {
      const mailBtn = page.getByTestId('contacts-view-email-compose').first()
      await expect(mailBtn).toBeVisible({ timeout: T(15000) })
      await clickReady(mailBtn)
      await expectComposeOpen(page)
      await attachScreenshot(page, 'contacts-compose-01')
    })

    await step('Close compose without sending', async () => {
      await closeComposeWithoutSending(page)
    })

    await step('Cleanup: delete contact', async () => {
      if (await page.getByTestId('contacts-view').isVisible().catch(() => false)) {
        await deleteOpenedContact(page, fullName)
        return
      }
      await openContacts(page)
      await openContactByName(page, fullName)
      await deleteOpenedContact(page, fullName)
    })
  })

  test('shares contact then unshares from Shared storage', async ({ page }) => {
    test.setTimeout(T(240000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Share ${stamp}`
    const email = `e2e.share.${stamp}@example.com`

    await step('Create personal contact', async () => {
      await createContactViaFab(page, { fullName, email })
      await openContactByName(page, fullName)
    })

    await step('Share contact', async () => {
      const share = page.getByTestId('contacts-menu-share')
      test.skip(
        (await share.count()) === 0 ||
          !(await share.isVisible().catch(() => false)),
        'Share action not available (team/shared storage or permissions)'
      )
      await clickReady(share)
      await waitForListReady(page, listReadyOptions)
      console.log(`  → Shared: ${fullName}`)
      await attachScreenshot(page, 'contacts-share-01')
    })

    await step('Open Shared storage and unshare', async () => {
      const shared = page.locator(
        '[data-test-id="contacts-storage-item"][data-storage="shared"]'
      )
      const sharedFallback = page
        .getByTestId('contacts-storage-item')
        .filter({ hasText: /shared/i })
        .first()
      test.skip(
        (await shared.count()) === 0 && (await sharedFallback.count()) === 0,
        'No Shared storage in sidebar'
      )
      await openContactsStorage(page, 'shared')
      await clearContactsSearch(page)
      await openContactByName(page, fullName)
      await expect(page.getByTestId('contacts-view')).toBeVisible({
        timeout: 30000,
      })
      const unshare = page.getByTestId('contacts-menu-unshare')
      await expect(unshare).toBeVisible({ timeout: T(10000) })
      await clickReady(unshare)
      await waitForListReady(page, listReadyOptions)
      console.log(`  → Unshared: ${fullName}`)
      await attachScreenshot(page, 'contacts-share-02-unshared')
    })

    await step('Cleanup: delete from personal storage if still there', async () => {
      // Not .first() — the sidebar lists "All" before "Personal"; Delete is hidden
      // while "All" is selected (isDeleteVisible requires personal/shared/address book).
      await openContactsStorage(page, 'personal')
      await clearContactsSearch(page)
      const item = page
        .getByTestId('contacts-item')
        .filter({ hasText: fullName })
      if ((await item.count()) === 0) {
        console.log('  → Contact already gone after unshare')
        return
      }
      await openContactByName(page, fullName)
      await expect(page.getByTestId('contacts-view')).toBeVisible({
        timeout: T(30000),
      })
      await expect(page.getByTestId('contacts-menu-delete')).toBeVisible({
        timeout: T(15000),
      })
      await deleteOpenedContact(page, fullName)
    })
  })

  test('find in mail from contact menu', async ({ page }) => {
    test.setTimeout(T(300000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E FindMail ${stamp}`
    // Real mailbox address — Find in Mail runs `email:<address>` in Inbox; a
    // fake @example.com contact would always yield an empty search.
    const email = getComposeTo()
    const subject = `E2E FindMail ${stamp}`

    await step('Create contact and open card', async () => {
      await createContactViaFab(page, { fullName, email })
      await openContactByName(page, fullName)
      await expect(page.getByTestId('contacts-view')).toBeVisible({
        timeout: T(30000),
      })
      await expect(page.getByTestId('contacts-menu-find-in-mail')).toBeVisible({
        timeout: T(15000),
      })
    })

    await step(`Send mail to contact (${email})`, async () => {
      await clickNav(page, 'nav-mail')
      await waitForInboxList(page)
      await clickReady(page.getByTestId('mail-compose-fab'))
      await expect(page.getByTestId('mail-compose')).toBeVisible({
        timeout: T(15000),
      })
      await fillComposeRecipient(page, email)
      await fieldControl(page, 'mail-compose-subject').fill(subject)
      await fillComposeBody(page, `E2E find-in-mail body ${stamp}`)
      await sendCompose(page)
      console.log(`  → Sent: "${subject}" → ${email}`)
    })

    await step('Contact → Find in Mail → message in list', async () => {
      await openContacts(page)
      await openContactByName(page, fullName)
      await clickReady(page.getByTestId('contacts-menu-find-in-mail'))
      await expect(page.getByTestId('mail-message-list')).toBeVisible({
        timeout: T(60000),
      })
      await expect(
        page.getByTestId('mail-message-item').filter({ hasText: subject }).first()
      ).toBeVisible({ timeout: T(60000) })
      console.log('  → Find in Mail shows the sent message')
      await attachScreenshot(page, 'contacts-find-mail-01')
    })

    await step('Cleanup: delete contact', async () => {
      await openContacts(page)
      await openContactByName(page, fullName)
      await deleteOpenedContact(page, fullName)
    })
  })
})
