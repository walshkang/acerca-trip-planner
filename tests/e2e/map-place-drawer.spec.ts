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

function skipOnAuthInfraError(error: unknown): never {
  if (
    error instanceof Error &&
    (/Seed failed \(401\):/.test(error.message) ||
      /Not signed in\./.test(error.message))
  ) {
    test.skip(true, 'Auth/session unavailable for seeded E2E run')
  }
  throw error
}

async function waitForMembershipApplied(placeDrawer: Locator, membershipButton: Locator) {
  await expect(membershipButton).toHaveAttribute('aria-pressed', 'true')
  const tagInput = placeDrawer.getByPlaceholder('Add tags (comma-separated)')
  await expect(tagInput).toBeVisible()
  await expect(tagInput).toBeEnabled()
  return tagInput
}

test('map pin opens place drawer and shows selected list membership controls', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  try {
    await ensureSignedIn(page)
  } catch (error) {
    skipOnAuthInfraError(error)
  }

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    let seed: Awaited<ReturnType<typeof seedListWithPlace>>
    try {
      seed = await seedListWithPlace(page)
    } catch (error) {
      skipOnAuthInfraError(error)
    }
    seeds.push(seed)

    await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
    await ensureSignedIn(page)

    await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()
    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)

    const membershipButton = placeDrawer.getByRole('button', {
      name: new RegExp(escapeRegex(seed.list.name)),
    })
    const isSelected = await membershipButton
      .getAttribute('aria-pressed')
      .then((value) => value === 'true')
      .catch(() => false)
    if (!isSelected) await membershipButton.click()

    const tagInput = await waitForMembershipApplied(placeDrawer, membershipButton)
    const tagValue = `playwright-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`
    await tagInput.fill(tagValue)
    await placeDrawer.getByRole('button', { name: 'Add' }).click()
    await expect(placeDrawer.getByText(tagValue)).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer URL supports deep link and back/forward', async ({ page }) => {
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    let seed: Awaited<ReturnType<typeof seedListWithPlace>>
    try {
      seed = await seedListWithPlace(page)
    } catch (error) {
      skipOnAuthInfraError(error)
    }
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

    await page.goForward()
    await expect(placeDrawer).toBeHidden()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
