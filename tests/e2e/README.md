Playwright E2E tests for research flows.

To run:
1. Ensure .env.local contains PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_BASE_URL=http://localhost:3010
2. Start dev server: PORT=3010 npm run dev
3. Run tests: npx playwright test --project=chromium

Notes:
- Tests are templates and may require selector tweaks to match the app UI.
- Do not commit secrets in .env.local.
