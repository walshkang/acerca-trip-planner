import { test, expect } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  ensureSignedIn,
  seedListWithPlace,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

test('list detail local search adds approved places', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seedA = await seedListWithPlace(page)
  const seedB = await seedListWithPlace(page)

  await page.goto(`/lists/${seedA.list.id}`)

  const searchInput = page.getByPlaceholder('Search approved places')
  await expect(searchInput).toBeVisible()
  await searchInput.fill(seedB.place_name)

  const results = page.getByTestId('local-search-results')
  await expect(results).toBeVisible()
  const resultName = results.getByText(seedB.place_name).first()
  await expect(resultName).toBeVisible()
  const resultCard = resultName.locator('../../..')
  await expect(resultCard).toContainText('Approved')
  await resultCard.getByRole('button', { name: 'Add' }).click()

  await expect(resultCard.getByRole('button', { name: 'Added' })).toBeVisible()

  const placesSection = page
    .getByRole('heading', { name: 'Places' })
    .locator('..')
  await expect(placesSection.getByText(seedB.place_name)).toBeVisible()
})
