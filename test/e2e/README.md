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

## P1 specs (`contacts-p1.spec.js`)

- import `.vcf` → contact in list
- export contacts (download)
- save phone + address on simple edit form, reopen card

Stand gates: Import/Export hidden when the stand disables formats.
