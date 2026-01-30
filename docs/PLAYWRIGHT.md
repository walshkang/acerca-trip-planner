# Playwright E2E (local workflow)

This repo uses Playwright for browser-level smoke checks. The tests assume you are logged in.

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

## 2.5) Configure the seed token (required for E2E seeding)
Playwright seeds data via `/api/test/seed`. Set a token in your dev env:

```
export PLAYWRIGHT_SEED_TOKEN=local-playwright
```

Also ensure your server has `SUPABASE_SERVICE_ROLE_KEY` set (used for seeding).

## 3) Run tests
```sh
npm run test:e2e
```

Useful variants:
- UI mode (interactive): `npm run test:e2e:ui`
- Debug mode (step through): `npm run test:e2e:debug`

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
