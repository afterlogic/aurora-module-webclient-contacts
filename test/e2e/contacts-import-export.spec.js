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
  createContactViaFab,
  openContactByName,
  deleteOpenedContact,
  searchContacts,
} = require('./helpers/contacts')

test.describe('Desktop contacts import and export', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')

  test.describe('Import', () => {
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
        'ADR:;;E2E Street 1;;;;;',
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
        const fileInput = page
          .locator('.middle_bar.import')
          .locator('input[type="file"]')
          .first()

        const [response] = await Promise.all([
          page.waitForResponse(
            async (res) => {
              if (
                res.request().method() !== 'POST' ||
                !/\/Api\/?(\?|$)/.test(res.url())
              ) {
                return false
              }
              try {
                const json = await res.json()
                return json?.Result?.ImportedCount != null
              } catch {
                return false
              }
            },
            { timeout: T(60000) }
          ),
          fileInput.setInputFiles({
            name: 'e2e-import.vcf',
            mimeType: 'text/vcard',
            buffer: Buffer.from(vcf),
          }),
        ])
        expect(response.ok()).toBeTruthy()
        const payload = await response.json()
        expect(payload?.Result?.ImportedCount).toBeGreaterThan(0)
        await expect(
          page
            .locator('.report_panel.report:not(.hide) .text')
            .filter({ hasText: /imported|импорт/i })
        ).toBeVisible({ timeout: T(10000) })
        await searchContacts(page, fullName)
        await expect(
          page.getByTestId('contacts-item').filter({ hasText: fullName }).first()
        ).toBeVisible({ timeout: T(30000) })
        console.log(`  → Imported: ${fullName}`)
        await attachScreenshot(page, 'contacts-import-01')
      })

      await step('Cleanup: delete imported contact', async () => {
        await openContactByName(page, fullName)
        await deleteOpenedContact(page, fullName)
      })
    })
  })

  test.describe('Export', () => {
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
        await attachScreenshot(page, 'contacts-export-01')
      })
    })
  })
})
