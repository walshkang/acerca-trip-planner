import { test, expect, type Page } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
  setTripDates,
  visiblePlanSurface,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

function plannerDayCellIso(planner: ReturnType<Page['locator']>, isoDate: string) {
  return planner.locator(`[data-testid="planner-day-cell"][data-day="${isoDate}"]`)
}

async function openPlanTab(page: Page) {
  await page.getByTestId('paper-header-tab-itinerary').click()
  await expect(page.getByTestId('calendar-planner')).toBeVisible()
}

function waitForPlannerPatch(page: Page, listId: string, timeout = 20_000) {
  return page.waitForResponse(
    (res) =>
      res.request().method() === 'PATCH' &&
      res.url().includes(`/api/lists/${listId}/items/`) &&
      res.ok(),
    { timeout }
  )
}

test('planner move picker schedules item to day, done, and backlog', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    const today = new Date().toISOString().slice(0, 10)
    await setTripDates(page, seed.list.id, {
      start_date: today,
      end_date: today,
      timezone: 'America/New_York',
    })

    await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
    await ensureSignedIn(page)

    await openPlanTab(page)
    const planner = visiblePlanSurface(page)
    await expect(planner).toBeVisible()
    await expect(planner.getByText(seed.place_name)).toBeVisible()

    await planner.getByRole('button', { name: 'Move' }).first().click()
    const movePicker = page.getByTestId('planner-move-picker')
    await expect(movePicker).toBeVisible()
    const patchToDay = waitForPlannerPatch(page, seed.list.id)
    await movePicker.locator('button').filter({ hasText: /\w{3}\s\d+/ }).first().click()
    await patchToDay
    await expect(movePicker).toBeHidden()
    await expect(plannerDayCellIso(planner, today).getByText(seed.place_name)).toBeVisible()

    await planner.getByRole('button', { name: 'Move' }).first().click()
    await expect(movePicker).toBeVisible()
    const patchToDone = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Done' }).click()
    await patchToDone
    await expect(movePicker).toBeHidden()

    await planner.getByRole('button', { name: /Done1/ }).click()
    await expect(planner.getByText(seed.place_name)).toBeVisible()

    await planner.getByRole('button', { name: 'Move' }).first().click()
    await expect(movePicker).toBeVisible()
    const patchToBacklog = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Backlog' }).click()
    await patchToBacklog
    await expect(movePicker).toBeHidden()
    await expect(planner.getByTestId('planner-backlog').getByText(seed.place_name)).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
