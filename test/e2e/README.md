# Desktop E2E (Playwright)

Scenarios for **ContactsWebclient**. Runner lives at the Aurora install root:

```bash
# from install root
npm run test:e2e-desktop
./modules/CoreWebclient/test/e2e/run.sh

# this module only (Chrome)
npm run test:e2e-desktop -- --setup "ContactsWebclient Chrome"
```

Shared helpers: `modules/CoreWebclient/test/e2e/helpers/` (`AURORA_E2E_ROOT`).
Domain helpers: `./helpers/` in this folder.

Filter Playwright UI / CLI by **file name** or nested `test.describe`.

| File | What it covers |
|------|----------------|
| `contacts.spec.js` | Open first contact, list + create |
| `contacts-actions.spec.js` | Storages, search, CRUD, groups, compose, share, find in mail, extra fields |
| `contacts-extra-actions.spec.js` | Team storage, Send from contact |
| `contacts-select-actions.spec.js` | Multi-select delete/compose, assign to group, rename group |
| `contacts-import-export.spec.js` | Import `.vcf`, export download |

Stand gates: Import/Export hidden when the stand disables formats.
