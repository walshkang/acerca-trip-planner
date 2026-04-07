import { test, expect } from '@playwright/test'

import {
  addPlaceToList,
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
  setListItemTags,
  visibleByTestId,
  waitForPlaceDrawerReady,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

test('list tag filters work in list detail view', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seedA = await seedListWithPlace(page)
    const seedB = await seedListWithPlace(page)
    seeds.push(seedA, seedB)

    await addPlaceToList(page, seedA.list.id, seedB.place_id, ['brunch'])
    await setListItemTags(page, seedA.list.id, seedA.place_id, ['date-night'])

    await page.goto(`/?list=${encodeURIComponent(seedA.list.id)}`)
    await ensureSignedIn(page)

    const panel = page.getByTestId('paper-explore-panel')
    await expect(panel).toBeVisible()
    const listDrawer = panel.getByTestId('list-drawer')
    await expect(listDrawer).toBeVisible()

    const placeRowA = listDrawer.locator(`[data-place-id="${seedA.place_id}"]`).first()
    const placeRowB = listDrawer.locator(`[data-place-id="${seedB.place_id}"]`).first()
    await expect(placeRowA).toBeVisible()
    await expect(placeRowA).toContainText(seedA.place_name)
    await expect(placeRowB).toBeVisible()
    await expect(placeRowB).toContainText(seedB.place_name)

    // Open filters and apply tag filter
    const filterToggle = listDrawer.getByRole('button', { name: /Filter/i }).first()
    await filterToggle.click()

    const tagFilters = listDrawer.getByTestId('list-tag-filters')
    await expect(tagFilters).toBeVisible()

    await tagFilters.getByRole('button', { name: 'date-night', exact: true }).click()
    await expect(placeRowA).toBeVisible()
    await expect(placeRowB).toBeHidden()

    await tagFilters.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(placeRowA).toBeVisible()
    await expect(placeRowB).toBeVisible()

    await tagFilters.getByRole('button', { name: 'brunch', exact: true }).click()
    await expect(placeRowB).toBeVisible()
    await expect(placeRowA).toBeHidden()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('map marker click focuses list row and opens place drawer', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
    await ensureSignedIn(page)

    const listDrawer = page.getByTestId('paper-explore-panel').getByTestId('list-drawer')
    await expect(listDrawer).toBeVisible()

    const focusedRow = listDrawer.locator(`[data-place-id="${seed.place_id}"]`).first()
    await expect(focusedRow).toBeVisible()
    await expect(focusedRow).toContainText(seed.place_name)

    const markerButton = page.getByRole('button', { name: `Open ${seed.place_name}` })
    await expect(markerButton).toBeVisible()
    await markerButton.dispatchEvent('click')

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
    await expect(page).toHaveURL(
      new RegExp(`[?&]place=${encodeURIComponent(seed.place_id)}`)
    )

    await expect(placeDrawer).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
