# Playwright E2E (local workflow)

This repo uses Playwright for browser-level smoke checks.

## 1) Install browsers (one-time)
```sh
npx playwright install
```

## 2) Configure auth + seed env (required)
Playwright signs in as a dedicated seed user (email/password) and uses a guarded
seed endpoint to create deterministic data for tests.

```sh
export PLAYWRIGHT_SEED_TOKEN=local-playwright
export PLAYWRIGHT_SEED_EMAIL=playwright@example.com
export PLAYWRIGHT_SEED_PASSWORD=replace-with-a-strong-password
```

Also ensure the app server has `SUPABASE_SERVICE_ROLE_KEY` set (used for `/api/test/seed`).

## 2.5) Create/verify the seed user (one-time)
This uses the service role key to create (or confirm) the seed user and verifies
that password sign-in works.

```sh
node scripts/ensure-playwright-seed-user.mjs
```

## 3) Run tests
In another terminal, ensure the app server is running at `PLAYWRIGHT_BASE_URL`
(default `http://localhost:3000`):
```sh
npm run dev
```

```sh
npm run test:e2e
```

Notes:
- The Playwright `globalSetup` writes auth storage state to `playwright/.auth/user.json` automatically.
- To bypass auth setup (and use manual login state), set `PLAYWRIGHT_SKIP_AUTH_SETUP=1`.

Useful variants:
- UI mode (interactive): `npm run test:e2e:ui`
- Debug mode (step through): `npm run test:e2e:debug`

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
