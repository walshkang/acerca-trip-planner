import { randomUUID } from 'crypto'
import { test, expect, type Locator } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  escapeRegex,
  seedListWithPlace,
  visibleByTestId,
  waitForPlaceDrawerReady,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

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
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()

    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
    const placeButton = placesSection.getByRole('button', { name: seed.place_name })
    await expect(placeButton).toBeVisible()
    await placeButton.click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)

    const membershipButton = placeDrawer.getByRole('button', {
      name: new RegExp(escapeRegex(seed.list.name)),
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
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer stays below inspector overlay', async ({ page }) => {
  await page.goto('/')

  await ensureSignedIn(page)
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()
    const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
    const placeButton = placesSection.getByRole('button', { name: seed.place_name })
    await expect(placeButton).toBeVisible()
    await placeButton.click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    const rightOverlay = page.getByTestId('map-overlay-right')

    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
    await expect(rightOverlay).toBeVisible()

    const placeBox = await placeDrawer.boundingBox()
    const overlayBox = await rightOverlay.boundingBox()

    expect(placeBox && overlayBox).toBeTruthy()
    if (!placeBox || !overlayBox) return

    expect(placeBox.y).toBeGreaterThanOrEqual(overlayBox.y + overlayBox.height - 1)
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer URL supports deep link and back/forward', async ({ page }) => {
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)
    const encodedPlaceId = encodeURIComponent(seed.place_id)

    await page.goto(`/?place=${encodedPlaceId}`)
    await ensureSignedIn(page)

    const placeDrawer = visibleByTestId(page, 'place-drawer')
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
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('transit overlay does not block marker clicks', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Tools' }).click()
    const transitToggle = page.getByLabel('Transit lines')
    await transitToggle.check()
    await page.getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await expect(placeDrawer).toBeVisible()
    await expect(
      placeDrawer.getByRole('heading', { name: seed.place_name })
    ).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
