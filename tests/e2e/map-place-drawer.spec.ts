import { test, expect, type Page } from '@playwright/test'

async function ensureSignedIn(page: Page) {
  const loadingText = page.getByText('Loading map...')
  await loadingText.waitFor({ state: 'detached' }).catch(() => null)

  const signOut = page.getByRole('button', { name: 'Sign out' })
  try {
    await signOut.waitFor({ state: 'visible', timeout: 15000 })
    return
  } catch {
    const signIn = page.getByRole('link', { name: 'Sign in' })
    const isSignedOut = await signIn.isVisible().catch(() => false)
    if (isSignedOut) {
      throw new Error(
        'Not signed in. Create playwright/.auth/user.json via: npx playwright codegen http://localhost:3000 --save-storage=playwright/.auth/user.json'
      )
    }
    throw new Error('Sign out button not visible. Map may still be loading.')
  }
}

async function seedListWithPlace(page: Page) {
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!seedToken) {
    throw new Error('PLAYWRIGHT_SEED_TOKEN is not set for Playwright seeding.')
  }

  const res = await page.request.post('/api/test/seed', {
    headers: { 'x-seed-token': seedToken },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Seed failed (${res.status()}): ${body}`)
  }
  const json = (await res.json()) as {
    list?: { id: string; name: string }
    place_id?: string
    place_name?: string
  }
  if (!json.list?.id || !json.place_id || !json.place_name) {
    throw new Error('Seed response missing list/place data')
  }
  return json
}

test('place drawer opens and tags are editable for active list', async ({ page }) => {
  await page.goto('/')

  await ensureSignedIn(page)
  const seed = await seedListWithPlace(page)

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()

  await listDrawer.getByRole('button', { name: seed.list.name }).click()

  const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
  await placesSection.getByText(seed.place_name).click()

  const placeDrawer = page.getByTestId('place-drawer')
  await expect(placeDrawer).toBeVisible()

  const membershipButton = placeDrawer.getByRole('button', {
    name: new RegExp(seed.list.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
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

  await ensureSignedIn(page)
  const seed = await seedListWithPlace(page)

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()
  await listDrawer.getByRole('button', { name: seed.list.name }).click()
  const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
  await placesSection.getByText(seed.place_name).click()

  const placeDrawer = page.getByTestId('place-drawer')
  const rightOverlay = page.getByTestId('map-overlay-right')

  await expect(placeDrawer).toBeVisible()
  await expect(rightOverlay).toBeVisible()

  const placeBox = await placeDrawer.boundingBox()
  const overlayBox = await rightOverlay.boundingBox()

  expect(placeBox && overlayBox).toBeTruthy()
  if (!placeBox || !overlayBox) return

  expect(placeBox.y).toBeGreaterThanOrEqual(overlayBox.y + overlayBox.height - 1)
})
