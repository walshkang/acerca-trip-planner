import { test, expect } from '@playwright/test'

test('place drawer opens and tags are editable for active list', async ({ page }) => {
  await page.goto('/')

  const signOut = page.getByRole('button', { name: 'Sign out' })
  if (!(await signOut.isVisible().catch(() => false))) {
    test.skip(true, 'Auth required. Run Playwright auth setup first.')
  }

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()

  const listChipSection = listDrawer.getByRole('link', { name: 'Manage lists' }).locator('..')
  const listButtons = listChipSection
    .locator('button')
    .filter({ hasNotText: 'Clear' })
    .filter({ hasNotText: 'Close' })
    .filter({ hasNotText: 'Create' })

  const listButtonCount = await listButtons.count()
  if (!listButtonCount) {
    test.skip(true, 'No lists available to test place drawer tags.')
  }

  const listName = (await listButtons.first().textContent())?.trim() ?? ''
  await listButtons.first().click()

  const listItemsEmpty = await listDrawer
    .getByText('No places in this list yet.')
    .isVisible()
    .catch(() => false)
  if (listItemsEmpty) {
    test.skip(true, 'Selected list has no places to open in the drawer.')
  }

  const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
  const firstPlaceButton = placesSection
    .locator('button')
    .filter({ hasText: /.+/ })
    .first()
  await firstPlaceButton.click()

  const placeDrawer = page.getByTestId('place-drawer')
  await expect(placeDrawer).toBeVisible()

  const membershipButton = placeDrawer.getByRole('button', {
    name: new RegExp(listName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  })
  const isSelected = await membershipButton
    .getAttribute('aria-pressed')
    .then((value) => value === 'true')
    .catch(() => false)
  if (!isSelected) {
    await membershipButton.click()
    await expect(placeDrawer.getByText('List tags')).toBeVisible()
  }

  const tagInput = placeDrawer.getByPlaceholder('Add tags (comma-separated)')
  await expect(tagInput).toBeVisible()
  await tagInput.fill('playwright-smoke')
  await placeDrawer.getByRole('button', { name: 'Add' }).click()
  await expect(placeDrawer.getByText('Saved.')).toBeVisible()
})

test('place drawer stays below inspector overlay', async ({ page }) => {
  await page.goto('/')

  const signOut = page.getByRole('button', { name: 'Sign out' })
  if (!(await signOut.isVisible().catch(() => false))) {
    test.skip(true, 'Auth required. Run Playwright auth setup first.')
  }

  const marker = page.locator('button[aria-label^="Open "]').first()
  if (!(await marker.isVisible().catch(() => false))) {
    test.skip(true, 'No map markers available to test drawer stacking.')
  }

  await marker.click()

  const placeDrawer = page.getByTestId('place-drawer')
  const rightOverlay = page.getByTestId('map-overlay-right')

  await expect(placeDrawer).toBeVisible()
  await expect(rightOverlay).toBeVisible()

  const placeBox = await placeDrawer.boundingBox()
  const overlayBox = await rightOverlay.boundingBox()

  if (!placeBox || !overlayBox) {
    test.skip(true, 'Unable to compute overlay positions.')
  }

  expect(placeBox.y).toBeGreaterThanOrEqual(overlayBox.y + overlayBox.height - 1)
})
