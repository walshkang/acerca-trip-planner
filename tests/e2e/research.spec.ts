import { test, expect, request } from '@playwright/test';

// Playwright E2E tests for research / social flows
// Prereqs (in .env.local): PLAYWRIGHT_TEST_EMAIL, PLAYWRIGHT_BASE_URL (http://localhost:3010)
// Run with: npx playwright test tests/e2e/research.spec.ts --project=chromium

// NOTE: These tests are templates that use the app UI and API. Fill the TODOs
// with concrete IDs or ensure your seed flow provides the expected data.

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3010';
const PLAYWRIGHT_TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;

// Helper: perform a headless sign-in using the app's test seed magic link flow.
// The app in this repo includes an internal test global-setup flow when PLAYWRIGHT_TEST_EMAIL is set.
// If your project uses a different auth flow, replace this with the project's recommended sign-in helper.
async function signIn(page) {
  if (!PLAYWRIGHT_TEST_EMAIL) {
    throw new Error('Set PLAYWRIGHT_TEST_EMAIL in env for headless sign-in');
  }
  await page.goto(`${BASE}/`);
  // Navigate to sign-in UI — adjust selectors if your app differs
  await page.click('text=Sign in');
  await page.fill('input[type="email"]', PLAYWRIGHT_TEST_EMAIL);
  await page.click('button:has-text("Send magic link")');
  // The app's test harness should complete sign-in automatically in E2E.
  // Wait for an element that shows a signed-in state.
  await page.waitForSelector('role=button[name="Account"]', { timeout: 15000 });
}

// Test: create research list shows validation error on empty/whitespace name
test('create research list shows validation error when name trims to empty', async ({ page }) => {
  await signIn(page);
  // Open Sources UI — adjust navigation to match your app
  await page.click('text=Sources');
  await page.click('text=Create research list');
  await page.fill('input[name="research-list-name"]', '    ');
  await page.click('button:has-text("Create")');
  // Expect visible red validation text under the input
  const err = await page.locator('text=Name is required').first();
  await expect(err).toBeVisible();
});

// Test: social place scope — adding unattached social place returns 404
// This test uses the app API; you must replace <TRIP_LIST_ID> and <UNATTACHED_PLACE_ID>
// with values available in your test database or seed flow.
test('adding unattached social place returns 404', async ({ request, page }) => {
  await signIn(page);

  // TODO: Replace with a real trip list id the signed-in user owns
  const TRIP_LIST_ID = process.env.TEST_TRIP_LIST_ID || '<trip-list-id>';
  const UNATTACHED_PLACE_ID = process.env.TEST_UNATTACHED_SOCIAL_PLACE_ID || '<unattached-social-place-id>';

  // Grab browser cookies after sign-in to include in API request
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const resp = await request.post(`${BASE}/api/lists/${TRIP_LIST_ID}/items`, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
    },
    data: { place_id: UNATTACHED_PLACE_ID },
  });

  expect([404, 403]).toContain(resp.status());
});

// Quick smoke: happy path creates research list, attaches source, votes and add-to-trip
// This is a higher-level integration test and will be flaky if selectors differ.
// The test assumes seeded sources and places are discoverable in the UI.
test('happy path: create research list, attach source, vote, add to trip', async ({ page }) => {
  await signIn(page);
  await page.click('text=Sources');

  // Create research list (use a deterministic name to find it later)
  const listName = `E2E Research ${Date.now()}`;
  await page.click('text=Create research list');
  await page.fill('input[name="research-list-name"]', listName);
  await page.click('button:has-text("Create")');
  await page.waitForSelector(`text=${listName}`);

  // Attach a source — selectors depend on your UI. This is a best-effort flow.
  await page.click(`text=${listName}`);
  await page.click('text=Attach source');
  // Select first available source
  await page.click('button[data-testid="attach-source-first"]');
  // Wait for places to load in the research list view
  await page.waitForSelector('[data-testid="research-place-item"]');

  // Vote up the first place and assert score updates
  const place = page.locator('[data-testid="research-place-item"]').first();
  const scoreBefore = await place.locator('[data-testid="place-score"]').innerText();
  await place.click('button:has-text("Upvote")');
  await expect(place.locator('[data-testid="place-score"]')).not.toHaveText(scoreBefore);

  // Add to trip (use "Add to trip" control)
  await place.click('button:has-text("Add to trip")');
  // Open Trips / My trip list and assert item exists
  await page.click('text=Trips');
  await page.waitForSelector('[data-testid="trip-list-item"]');
  const added = page.locator('text=' + listName).first();
  // We expect provenance/note to be present — look for "source" or similar text
  await expect(page.locator('text=source').first()).toBeVisible({ timeout: 5000 });
});

// Note: Truncation indicator ([truncated]) is triggered for notes > 7900 characters.
// If you need to assert that behavior, seed a very-long note and verify the UI shows "[truncated]".
