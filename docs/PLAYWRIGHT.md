# Playwright E2E (seeded suite)

Seeded Playwright coverage is active for the current restored suite when seed
prerequisites exist.

Active seeded specs:
- `tests/e2e/list-planner-move.spec.ts`
- `tests/e2e/map-place-drawer.spec.ts`
- `tests/e2e/list-local-search.spec.ts`
- `tests/e2e/list-filters-and-map-link.spec.ts`

Current restored seeded total: 12 tests.

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
Standard:
```sh
npm run test:e2e
```

Constrained local environments (where the dev server must stay in the same shell lifecycle):
```sh
/bin/zsh -lc '
set -euo pipefail
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac15-arm64 npm run dev -- -H 127.0.0.1 -p 3010 >/tmp/acerca-next-e2e.log 2>&1 &
DEV_PID=$!
trap "kill \"$DEV_PID\" >/dev/null 2>&1 || true; wait \"$DEV_PID\" >/dev/null 2>&1 || true" EXIT
for i in {1..90}; do
  curl -sf http://127.0.0.1:3010/ >/dev/null && break
  sleep 1
done
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac15-arm64 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npm run test:e2e
'
```

If `PLAYWRIGHT_SEED_TOKEN` or storage state is missing, seeded tests are skipped
with an explicit message.

Useful variants:
- UI mode (interactive): `npm run test:e2e:ui`
- Debug mode (step through): `npm run test:e2e:debug`

## 3.25) Manual CI run (workflow_dispatch)
Manual seeded E2E can be run via GitHub Actions workflow:
- Workflow: `.github/workflows/playwright-seeded.yml`
- Trigger: `workflow_dispatch` only

Required repository secrets:
- `PLAYWRIGHT_SEED_TOKEN`: token accepted by `/api/test/seed`
- `PLAYWRIGHT_STORAGE_STATE_JSON`: full JSON content of a valid Playwright storage state
  (equivalent to local `playwright/.auth/user.json`)

Notes:
- Workflow runs with `NEXT_PUBLIC_MAP_PROVIDER=maplibre` to avoid map token coupling.
- Workflow writes `playwright/.auth/user.json` from secret JSON, starts a local Next server, and runs `npm run test:e2e`.
- Playwright report, test results, and server logs are uploaded as artifacts.

## 3.5) Optional Mapbox run (compat)
Set the provider flag before starting the app server (or in `.env.local`):

```sh
export NEXT_PUBLIC_MAP_PROVIDER=mapbox
```

Then run Playwright as usual. This lets you verify the Mapbox path when needed.

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
- Seeded specs share helpers in `tests/e2e/seeded-helpers.ts` (env guards, API auth probe, seed helpers, and resilient visible test-id locators).
- Seeded specs now call guarded cleanup (`DELETE /api/test/seed`) in `finally` blocks to remove seeded lists/places created during test runs.
