import { test, expect } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

test('list detail local search adds approved places', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seedA = await seedListWithPlace(page)
    const seedB = await seedListWithPlace(page)
    seeds.push(seedA, seedB)

    await page.goto(`/lists/${seedA.list.id}`)
    await ensureSignedIn(page)

    const searchInput = page.getByPlaceholder('Search approved places')
    await expect(searchInput).toBeVisible()
    await searchInput.fill(seedB.place_name)

    const results = page.getByTestId('local-search-results')
    await expect(results).toBeVisible()
    const resultName = results.getByText(seedB.place_name).first()
    await expect(resultName).toBeVisible()
    const resultCard = resultName.locator('../../..')
    await expect(resultCard).toContainText('Approved')
    await expect(resultCard.getByTestId('local-search-category-chips')).toBeVisible()
    await expect(
      resultCard.getByTestId('local-search-category-chips').getByRole('button')
    ).toHaveCount(6)
    await resultCard.getByRole('button', { name: 'Add' }).click()

    await expect(resultCard.getByRole('button', { name: 'Added' })).toBeVisible()

    // Place should now appear in the list detail
    const listPanel = page.getByTestId('paper-explore-panel')
    await expect(listPanel.locator(`[data-place-id="${seedB.place_id}"]`).first()).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
