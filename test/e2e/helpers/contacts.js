const path = require('path')
const { sharedHelper, fixturePath } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { expect } = require('@playwright/test')
const { step, attachScreenshot, fieldControl } = sharedHelper('login')
const { waitForListReady, clickReady, clickNav, confirmOkIfVisible } = sharedHelper('ready')
const { T } = sharedHelper('timeouts')

const listReadyOptions = {
  itemTestIds: 'contacts-item',
  emptyTestId: 'contacts-empty',
  spinnerSelectors: [
    '.contacts_panel .list_loading',
    '.contacts .list_loading',
    '#selenium_contacts_loading_info',
  ],
  timeout: 60000,
}

async function openContacts(page) {
  await step('Open Contacts', async () => {
    await clickNav(page, 'nav-contacts')
    await expect(page.getByTestId('contacts-list')).toBeVisible({
      timeout: T(60000),
    })
    await waitForListReady(page, listReadyOptions)
  })
}

/**
 * Switch sidebar storage. Prefer data-storage=…; fall back to legacy hooks/text
 * for staging templates that are not redeployed yet.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'all'|'personal'|'shared'|'team'} kind
 */
async function openContactsStorage(page, kind) {
  const byAttr = page.locator(
    `[data-test-id="contacts-storage-item"][data-storage="${kind}"]`
  )
  if ((await byAttr.count()) > 0) {
    await clickReady(byAttr.first())
  } else if (kind === 'personal') {
    const selenium = page.locator('#selenium_contacts_personal_button')
    if ((await selenium.count()) > 0) {
      await clickReady(selenium)
    } else {
      await clickReady(
        page
          .getByTestId('contacts-storage-item')
          .filter({ hasText: /personal|личные|personal address/i })
          .first()
      )
    }
  } else {
    const labels = {
      all: /all|все/i,
      shared: /shared|общие|shared with all/i,
      team: /team|команд/i,
    }
    await clickReady(
      page
        .getByTestId('contacts-storage-item')
        .filter({ hasText: labels[kind] || new RegExp(kind, 'i') })
        .first()
    )
  }
  await expect(page.getByTestId('contacts-list')).toBeVisible({
    timeout: 30000,
  })
  await waitForListReady(page, listReadyOptions)
}


async function fillContactsField(page, testId, value) {
  const input = fieldControl(page, testId)
  await expect(input).toBeVisible({ timeout: T(15000) })
  // clear + pressSequentially for Knockout value binding
  await input.clear()
  await input.pressSequentially(String(value), { delay: 15 })
}

async function searchContacts(page, query) {
  const input = page.getByTestId('contacts-search-input')
  await expect(input).toBeVisible({ timeout: T(15000) })
  await input.clear()
  await input.fill(query)
  await input.press('Enter')
  await waitForListReady(page, listReadyOptions)
}

/** Clear list search so rename/create do not leave a stale filter. */
async function clearContactsSearch(page) {
  const input = page.getByTestId('contacts-search-input')
  if ((await input.count()) === 0) {
    return
  }
  const value = await input.inputValue().catch(() => '')
  if (!value) {
    return
  }
  await input.clear()
  await input.press('Enter')
  await waitForListReady(page, listReadyOptions)
}


/**
 * Desktop: contacts-create-fab opens edit form directly (no create-contact menu).
 */
async function createContact(page, { name, email }) {
  await step(`Create contact ${name} <${email}>`, async () => {
    await clickReady(page.getByTestId('contacts-create-fab'))
    await expect(page.getByTestId('contacts-edit')).toBeVisible({
      timeout: T(15000),
    })
    await fillContactsField(page, 'contacts-edit-name', name)
    await fillContactsField(page, 'contacts-edit-email', email)
    await clickReady(page.getByTestId('contacts-edit-save'))
    await expect(page.getByTestId('contacts-list')).toBeVisible({
      timeout: T(30000),
    })
    await waitForListReady(page, listReadyOptions)
  })
}

/** Mobile-named alias: createContactViaFab({ fullName, email }). */
async function createContactViaFab(page, { fullName, email, name }) {
  const contactName = fullName || name
  await clickReady(page.getByTestId('contacts-create-fab'))
  await expect(page.getByTestId('contacts-edit')).toBeVisible({
    timeout: T(30000),
  })
  await fillContactsField(page, 'contacts-edit-name', contactName)
  await fillContactsField(page, 'contacts-edit-email', email)
  await clickReady(page.getByTestId('contacts-edit-save'))
  // List is authoritative — view pane may stay empty after save on desktop.
  // New contact may be off page 1 after many E2E runs → search.
  const item = page
    .getByTestId('contacts-item')
    .filter({ hasText: contactName })
    .first()
  const onPage = await item.isVisible({ timeout: 5000 }).catch(() => false)
  if (!onPage) {
    await searchContacts(page, contactName)
  }
  await expect(item).toBeVisible({ timeout: T(45000) })
  await waitForListReady(page, listReadyOptions)
  if (!onPage) {
    // A left-over search filter breaks any later rename: the app's own
    // post-save list refresh re-applies it, the renamed contact no longer
    // matches, and the app deselects it (CContactsView.js changeRouting
    // fallback) right as the next step starts. Clear it now so nothing
    // downstream runs under a stale filter.
    await clearSearchIfActive(page)
  }
}

async function openContactByName(page, fullName) {
  let item = page
    .getByTestId('contacts-item')
    .filter({ hasText: fullName })
    .first()
  const onPage = await item.isVisible({ timeout: 5000 }).catch(() => false)
  if (!onPage) {
    await searchContacts(page, fullName)
    item = page
      .getByTestId('contacts-item')
      .filter({ hasText: fullName })
      .first()
  }
  await expect(item).toBeVisible({ timeout: T(30000) })
  await clickReady(item)
  // contacts-view uses v-show/visibility (element stays in the DOM), so if a
  // prior action already left it visible, toBeVisible() alone can resolve
  // instantly without confirming THIS click's contact actually loaded —
  // selectedContactUUID (route-driven, gates delete/menu actions) can still
  // be mid-flight at that point. Wait for the panel to show this contact's
  // own name instead, which only renders once the route has committed.
  await expect(page.getByTestId('contacts-view')).toBeVisible({
    timeout: T(30000),
  })
  await expect(page.getByTestId('contacts-view-name')).toHaveText(fullName, {
    timeout: T(30000),
  })
}

/**
 * A prior searchContacts() call (e.g. the fallback in createContactViaFab /
 * openContactByName) can leave the search box filled. While a search is
 * active, the app shows a "no results" node with no data-test-id instead of
 * contacts-empty, so waitForListReady's emptyTestId never matches and the
 * poll hangs until timeout. Clear it before relying on contacts-empty.
 */
async function clearSearchIfActive(page) {
  const input = page.getByTestId('contacts-search-input')
  const value = await input.inputValue().catch(() => '')
  if (value !== '') {
    await searchContacts(page, '')
  }
}

async function deleteOpenedContact(page, fullName) {
  await clickReady(page.getByTestId('contacts-menu-delete'))
  // Desktop may delete without ConfirmPopup.
  await confirmOkIfVisible(page, 5000)
  await expect(page.getByTestId('contacts-list')).toBeVisible({
    timeout: T(30000),
  })
  await clearSearchIfActive(page)
  await waitForListReady(page, listReadyOptions)
  await expect(
    page.getByTestId('contacts-item').filter({ hasText: fullName })
  ).toHaveCount(0, { timeout: T(30000) })
}

async function selectContactCheckbox(page, item) {
  const checkbox = item.getByTestId('contacts-item-checkbox')
  await clickReady(checkbox)
}

/** Toolbar "New message" when multiple contacts are checked (desktop .item.new_message). */
async function clickMultiSelectCompose(page) {
  const byTestId = page.getByTestId('contacts-select-email')
  if (
    (await byTestId.count()) > 0 &&
    (await byTestId.isVisible().catch(() => false))
  ) {
    await clickReady(byTestId)
    return
  }
  // Staging may lag template deploy — fall back to Knockout class hook.
  const legacy = page.locator('.toolbar .item.new_message').first()
  await expect(legacy).toBeVisible({ timeout: T(15000) })
  await clickReady(legacy)
}

async function createGroupViaFab(page, groupName) {
  await clickReady(page.getByTestId('contacts-create-group'))
  await expect(page.getByTestId('contacts-group-edit')).toBeVisible({
    timeout: T(30000),
  })
  await fillContactsField(page, 'contacts-group-edit-name', groupName)
  await clickReady(page.getByTestId('contacts-group-edit-save'))
  await expect(
    page.getByTestId('contacts-group-item').filter({ hasText: groupName }).first()
  ).toBeVisible({ timeout: T(45000) })
}

async function openGroupFromDrawer(page, groupName) {
  // Desktop: groups are always visible in the sidebar (no drawer).
  const group = page
    .getByTestId('contacts-group-item')
    .filter({ hasText: groupName })
    .first()
  await expect(group).toBeVisible({ timeout: T(15000) })
  await clickReady(group)
  await expect(page.getByTestId('contacts-list')).toBeVisible({
    timeout: T(30000),
  })
  await waitForListReady(page, listReadyOptions)
}

module.exports = {
  listReadyOptions,
  clickNav,
  openContacts,
  openContactsStorage,
  fillContactsField,
  searchContacts,
  clearContactsSearch,
  createContact,
  createContactViaFab,
  openContactByName,
  clearSearchIfActive,
  deleteOpenedContact,
  selectContactCheckbox,
  clickMultiSelectCompose,
  createGroupViaFab,
  openGroupFromDrawer,
  confirmOkIfVisible,
  waitForListReady,
  clickReady,
  step,
  attachScreenshot,
}
