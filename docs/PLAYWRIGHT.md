# Playwright E2E (paused)

Playwright is currently paused to avoid test data churn. The seeded endpoints
and helper scripts have been removed. If we revisit Playwright, we can re-add
the seeding flow and update these instructions.

## 1) Install browsers (one-time)
```sh
npx playwright install
```

## 2) Create an auth storage state (one-time, manual login)
This records your authenticated session so tests can run headless.

```sh
npx playwright codegen http://localhost:3000 --save-storage=playwright/.auth/user.json
```
- A browser opens. Log in normally.
- Once you see the app, close the browser window.
- The session is saved to `playwright/.auth/user.json`.

Tip: If you want to re-auth, delete that file and run the command again.

## 3) Run tests
```sh
npm run test:e2e
```

Note: these tests are currently unmaintained and may fail until the seeding
flow is restored.

Useful variants:
- UI mode (interactive): `npm run test:e2e:ui`
- Debug mode (step through): `npm run test:e2e:debug`

## 3.5) Optional MapLibre run (feasibility)
Set the provider flag before starting the app server (or in `.env.local`):

```sh
export NEXT_PUBLIC_MAP_PROVIDER=maplibre
```

Then run Playwright as usual. This keeps the default Mapbox path unchanged.

## 4) Common workflows
### Record a new flow quickly
```sh
npx playwright codegen http://localhost:3000
```
This generates Playwright code as you click around.

### Update snapshots / traces
Playwright collects traces on first retry. If a test fails, open the trace:
```sh
npx playwright show-trace test-results/.../trace.zip
```

## Notes
- Tests live in `tests/e2e/`.
- Storage state is ignored by git (`playwright/.auth/`).
