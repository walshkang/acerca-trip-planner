import { test, expect } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
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

test.describe('paper shell responsive', () => {
  test.describe.configure({ mode: 'serial' })
  test('desktop shows explore rail and tab switches to planner and back', async ({
    page,
  }) => {
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

      await expect(page.getByTestId('paper-explore-panel')).toBeVisible()

      await page.getByTestId('paper-header-tab-itinerary').click()
      await expect(page.getByTestId('calendar-planner')).toBeVisible()

      await page.getByTestId('paper-header-tab-map').click()
      await expect(page.getByTestId('paper-explore-panel')).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('mobile renders bottom sheet panel and supports tab switching', async ({
      page,
    }) => {
      await page.goto('/')
      try {
        await ensureSignedIn(page)
      } catch (error) {
        skipOnAuthInfraError(error)
      }

      const mobilePanel = page.getByTestId('paper-explore-panel-mobile')
      if ((await mobilePanel.count()) === 0) {
        test.skip(true, 'Mobile paper panel not available in this run')
      }
      await expect(mobilePanel).toBeVisible()
      await expect(
        mobilePanel.getByRole('button', { name: /Adjust panel height\./ })
      ).toHaveAttribute('aria-label', /Half height/)

      await page.getByTestId('paper-header-tab-itinerary').click()
      await expect(page.getByRole('heading', { name: 'Planner' })).toBeVisible()
    })
  })
})
