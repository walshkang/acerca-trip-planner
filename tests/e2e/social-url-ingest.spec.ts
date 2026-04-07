/**
 * E2E tests for Social URL Ingest UI (S5b).
 *
 * These tests cover the SocialUrlIngest component rendered inside
 * PaperExplorePanel. They are intentionally written RED before S5a/S5b
 * are implemented — make them green as part of the S5 implementation.
 *
 * Auth note: all tests use the automated storage state from global-setup
 * (no manual codegen needed). The dev server must be running on port 3010.
 */

import { test, expect } from '@playwright/test'
import { ensureSignedIn, hasStorageState } from './seeded-helpers'

test.describe('social URL ingest UI', () => {
  // Skip if auth state isn't available (CI without credentials, etc.)
  test.skip(!hasStorageState, 'Missing playwright/.auth/user.json — run npm run test:e2e once to generate')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await ensureSignedIn(page)
  })

  // --- Presence ---

  test('URL input and Add button are visible in explore panel', async ({ page }) => {
    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    await expect(urlInput).toBeVisible()

    const addButton = panel.getByRole('button', { name: 'Add' })
    await expect(addButton).toBeVisible()
    // Add is disabled while input is empty
    await expect(addButton).toBeDisabled()
  })

  test('Add button enables when URL is typed', async ({ page }) => {
    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    const addButton = panel.getByRole('button', { name: 'Add' })

    await expect(addButton).toBeDisabled()
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await expect(addButton).toBeEnabled()

    await urlInput.clear()
    await expect(addButton).toBeDisabled()
  })

  // --- Loading state ---

  test('Add shows loading indicator while request is in flight', async ({ page }) => {
    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Delay enqueue response so we can observe loading state before job id is set
    await page.route('**/api/enrichment/enqueue-social-job', (route) => {
      setTimeout(() => route.continue(), 3_000)
    })

    await panel.getByRole('button', { name: 'Add' }).click()

    // While loading, button shows '…' and is disabled
    await expect(panel.getByRole('button', { name: '…' })).toBeVisible()
    await expect(panel.getByRole('button', { name: '…' })).toBeDisabled()
  })

  // --- Error states ---

  test('unsupported platform shows error message', async ({ page }) => {
    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    await urlInput.fill('https://www.tiktok.com/@someone/video/123456789')
    await panel.getByRole('button', { name: 'Add' }).click()

    await expect(
      panel.getByText('Only YouTube and blog URLs are supported')
    ).toBeVisible({ timeout: 15_000 })

    // Input should retain the URL (not cleared on error) so user can edit it
    await expect(urlInput).toHaveValue('https://www.tiktok.com/@someone/video/123456789')
  })

  test('error clears and form resets after timeout', async ({ page }) => {
    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    await urlInput.fill('https://www.tiktok.com/@someone/video/123456789')
    await panel.getByRole('button', { name: 'Add' }).click()

    const errorMsg = panel.getByText('Only YouTube and blog URLs are supported')
    await expect(errorMsg).toBeVisible({ timeout: 15_000 })

    // S5b: error auto-dismisses after 5s — form returns to idle
    await expect(errorMsg).toBeHidden({ timeout: 8_000 })
    await expect(panel.getByRole('button', { name: 'Add' })).toBeVisible()
  })

  // --- Success state (requires full API stack: fetch-content + ingest-social + Google Places) ---
  // Marked as slow; skip in CI unless PLAYWRIGHT_RUN_SOCIAL_INGEST=true

  test('YouTube URL ingests places and shows count', async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_RUN_SOCIAL_INGEST,
      'Skipped by default — set PLAYWRIGHT_RUN_SOCIAL_INGEST=true to run (calls real YouTube + Google Places APIs)'
    )
    test.setTimeout(90_000)

    const panel = page.getByTestId('paper-explore-panel')
    const urlInput = panel.getByPlaceholder('Paste YouTube or blog URL…')
    // Short travel vlog with multiple place mentions — stable public video
    await urlInput.fill('https://www.youtube.com/watch?v=0lCHDKl5ZFk')
    await panel.getByRole('button', { name: 'Add' }).click()

    // Should show "N places added" — exact count varies by video content
    await expect(
      panel.getByText(/\d+ place(s)? added/)
    ).toBeVisible({ timeout: 60_000 })

    // Input clears on success
    await expect(urlInput).toHaveValue('')
  })
})
