import { randomUUID } from 'crypto'
import { test, expect, type Locator, type Page } from '@playwright/test'

test.skip(true, 'Playwright seeded E2E is temporarily descoped.')

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

async function waitForPlaceDrawerReady(
  placeDrawer: Locator,
  placeName: string
) {
  await expect(placeDrawer).toBeVisible()
  await expect(
    placeDrawer.getByRole('heading', { name: placeName })
  ).toBeVisible()
}

async function waitForMembershipApplied(
  placeDrawer: Locator,
  membershipButton: Locator
) {
  await expect(membershipButton).toHaveAttribute('aria-pressed', 'true')
  const tagInput = placeDrawer.getByPlaceholder('Add tags (comma-separated)')
  await expect(tagInput).toBeVisible()
  await expect(tagInput).toBeEnabled()
  return tagInput
}

test('place drawer opens and tags are editable for active list', async ({ page }, testInfo) => {
  await page.goto('/')

  await ensureSignedIn(page)
  const seed = await seedListWithPlace(page)

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()

  await listDrawer.getByRole('button', { name: seed.list.name }).click()

  const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
  const placeButton = placesSection.getByRole('button', { name: seed.place_name })
  await expect(placeButton).toBeVisible()
  await placeButton.click()

  const placeDrawer = page.getByTestId('place-drawer')
  await waitForPlaceDrawerReady(placeDrawer, seed.place_name)

  const membershipButton = placeDrawer.getByRole('button', {
    name: new RegExp(seed.list.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  })
  const isSelected = await membershipButton
    .getAttribute('aria-pressed')
    .then((value) => value === 'true')
    .catch(() => false)
  if (!isSelected) {
    await membershipButton.click()
  }

  const tagInput = await waitForMembershipApplied(placeDrawer, membershipButton)
  const tagValue = `playwright-smoke-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`
  await tagInput.fill(tagValue)
  const listItemsResponse = page.waitForResponse((res) => {
    return (
      res.request().method() === 'GET' &&
      res.url().includes(`/api/lists/${seed.list.id}/items`) &&
      res.ok()
    )
  })
  await placeDrawer.getByRole('button', { name: 'Add' }).click()
  await listItemsResponse
  const tagSection = placeDrawer.getByText('List tags').locator('..')
  await expect(tagSection.getByText(tagValue)).toBeVisible()
  const placeRow = placeButton.locator('..').locator('..')
  await expect(placeRow.getByText(tagValue)).toBeVisible()
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
  const placeButton = placesSection.getByRole('button', { name: seed.place_name })
  await expect(placeButton).toBeVisible()
  await placeButton.click()

  const placeDrawer = page.getByTestId('place-drawer')
  const rightOverlay = page.getByTestId('map-overlay-right')

  await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
  await expect(rightOverlay).toBeVisible()

  const placeBox = await placeDrawer.boundingBox()
  const overlayBox = await rightOverlay.boundingBox()

  expect(placeBox && overlayBox).toBeTruthy()
  if (!placeBox || !overlayBox) return

  expect(placeBox.y).toBeGreaterThanOrEqual(overlayBox.y + overlayBox.height - 1)
})

test('place drawer URL supports deep link and back/forward', async ({ page }) => {
  const seed = await seedListWithPlace(page)
  const encodedPlaceId = encodeURIComponent(seed.place_id)

  await page.goto(`/?place=${encodedPlaceId}`)
  await ensureSignedIn(page)

  const placeDrawer = page.getByTestId('place-drawer')
  await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
  await expect(page).toHaveURL(new RegExp(`[?&]place=${encodedPlaceId}`))

  await placeDrawer.getByRole('button', { name: 'Close' }).click()
  await expect(placeDrawer).toBeHidden()
  await expect(page).toHaveURL(/\/$/)

  await page.goBack()
  await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
  await expect(page).toHaveURL(new RegExp(`[?&]place=${encodedPlaceId}`))

  await page.goForward()
  await expect(placeDrawer).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})

test('transit overlay does not block marker clicks', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seed = await seedListWithPlace(page)

  const transitToggle = page.getByLabel('Transit lines')
  await transitToggle.check()

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()
  await listDrawer.getByRole('button', { name: seed.list.name }).click()

  await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()

  const placeDrawer = page.getByTestId('place-drawer')
  await expect(placeDrawer).toBeVisible()
  await expect(
    placeDrawer.getByRole('heading', { name: seed.place_name })
  ).toBeVisible()
})
