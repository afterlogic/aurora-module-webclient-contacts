const path = require('path')
const { sharedHelper } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { gotoLoggedIn, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { clickReady } = sharedHelper('ready')
const {
  openContacts,
  fillContactsField,
  createContactViaFab,
  openContactByName,
  deleteOpenedContact,
  clearContactsSearch,
} = require('./helpers/contacts')

test.describe('Desktop contacts P1', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')

  test('imports a .vcf contact into the list', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Import ${stamp}`
    const email = `e2e.import.${stamp}@example.com`
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fullName}`,
      `EMAIL:${email}`,
      'TEL:+10000000000',
      'ADR:;;E2E Street 1;;;;',
      'END:VCARD',
      '',
    ].join('\n')

    const importMenu = page.getByTestId('contacts-import-export')
    test.skip(
      !(await importMenu.isVisible().catch(() => false)),
      'Import/Export is not available on this stand'
    )

    await step('Open Import screen', async () => {
      await clickReady(importMenu)
      await expect(page.getByTestId('contacts-import')).toBeVisible({
        timeout: T(10000),
      })
      await clickReady(page.getByTestId('contacts-import'))
      await expect(page.getByTestId('contacts-import-file')).toBeVisible({
        timeout: T(20000),
      })
    })

    await step('Upload vCard', async () => {
      const fileInput = page.locator('input[type="file"]').first()
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles({
          name: 'e2e-import.vcf',
          mimeType: 'text/vcard',
          buffer: Buffer.from(vcf),
        })
      } else {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: T(15000) }),
          clickReady(page.getByTestId('contacts-import-file')),
        ])
        await fileChooser.setFiles({
          name: 'e2e-import.vcf',
          mimeType: 'text/vcard',
          buffer: Buffer.from(vcf),
        })
      }
      await expect(
        page.getByTestId('contacts-item').filter({ hasText: fullName }).first()
      ).toBeVisible({ timeout: T(60000) })
      console.log(`  → Imported: ${fullName}`)
      await attachScreenshot(page, 'contacts-p1-import-01')
    })

    await step('Cleanup: delete imported contact', async () => {
      await openContactByName(page, fullName)
      await deleteOpenedContact(page, fullName)
    })
  })

  test('exports contacts as a download', async ({ page }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const importMenu = page.getByTestId('contacts-import-export')
    test.skip(
      !(await importMenu.isVisible().catch(() => false)),
      'Import/Export is not available on this stand'
    )

    if ((await page.getByTestId('contacts-item').count()) === 0) {
      const stamp = Date.now()
      await createContactViaFab(page, {
        fullName: `E2E Export ${stamp}`,
        email: `e2e.export.${stamp}@example.com`,
      })
    }

    await step('Export via toolbar menu', async () => {
      await clickReady(importMenu)
      const exportItem = page.getByTestId('contacts-export-item').first()
      await expect(exportItem).toBeVisible({ timeout: T(10000) })
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: T(30000) }),
        clickReady(exportItem),
      ])
      const name = download.suggestedFilename()
      console.log(`  → Export: ${name}`)
      expect(name.length).toBeGreaterThan(0)
      await attachScreenshot(page, 'contacts-p1-export-01')
    })
  })

  test('saves phone and address extra fields and reopens them', async ({
    page,
  }) => {
    test.setTimeout(T(180000))
    await gotoLoggedIn(page)
    await openContacts(page)

    const stamp = Date.now()
    const fullName = `E2E Extra ${stamp}`
    const email = `e2e.extra.${stamp}@example.com`
    const phone = `+1555${String(stamp).slice(-7)}`
    const address = `E2E Street ${stamp}`

    await step('Create contact', async () => {
      await createContactViaFab(page, { fullName, email })
      await openContactByName(page, fullName)
    })

    await step('Edit phone and address', async () => {
      await clickReady(page.getByTestId('contacts-menu-edit'))
      await expect(page.getByTestId('contacts-edit')).toBeVisible({
        timeout: T(30000),
      })
      await fillContactsField(page, 'contacts-edit-phone', phone)
      await fillContactsField(page, 'contacts-edit-address', address)
      await clickReady(page.getByTestId('contacts-edit-save'))
      await clearContactsSearch(page)
      await openContactByName(page, fullName)
      await expect(page.getByTestId('contacts-view-phone')).toContainText(phone, {
        timeout: T(20000),
      })
      await expect(page.getByTestId('contacts-view-address')).toContainText(
        address,
        { timeout: T(20000) }
      )
      console.log(`  → Phone/address saved for ${fullName}`)
      await attachScreenshot(page, 'contacts-p1-extra-01')
    })

    await step('Cleanup: delete contact', async () => {
      await deleteOpenedContact(page, fullName)
    })
  })
})
