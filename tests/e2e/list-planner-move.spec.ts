import { test, expect, type Page } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
  visibleByTestId,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

async function setTripDates(page: Page, listId: string, date: string) {
  const res = await page.request.patch(`/api/lists/${listId}`, {
    headers: { 'content-type': 'application/json' },
    data: {
      start_date: date,
      end_date: date,
      timezone: 'America/New_York',
    },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to set trip dates (${res.status()}): ${body}`)
  }
}

async function openPlanTab(page: Page) {
  const planTab = page
    .locator('button.glass-tab:visible', { hasText: /^Plan$/ })
    .first()
  await planTab.click()
}

function waitForPlannerPatch(page: Page, listId: string) {
  return page.waitForResponse((res) => {
    return (
      res.request().method() === 'PATCH' &&
      res.url().includes(`/api/lists/${listId}/items/`) &&
      res.ok()
    )
  })
}

test('planner move picker schedules and completes list items', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    const today = new Date().toISOString().slice(0, 10)
    await setTripDates(page, seed.list.id, today)
    await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
    await ensureSignedIn(page)

    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()

    await openPlanTab(page)
    const planner = visibleByTestId(page, 'list-planner')
    await expect(planner).toBeVisible()
    await expect(planner.getByText(seed.place_name)).toBeVisible()

    await planner.getByRole('button', { name: 'Move' }).first().click()
    const movePicker = page.getByTestId('planner-move-picker')
    await expect(movePicker).toBeVisible()
    const patchToMorning = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Morning' }).click()
    await patchToMorning
    await expect(movePicker).toBeHidden()

    await expect(planner.getByText('Nothing in backlog.')).toBeVisible()

    const dayHeading = planner.getByRole('heading', { name: today })
    const dayCard = dayHeading.locator('..').locator('..')
    await expect(dayCard.getByText(seed.place_name)).toBeVisible()

    await page.reload()
    await ensureSignedIn(page)
    await expect(listDrawer).toBeVisible()
    await openPlanTab(page)
    await expect(planner.getByText('Nothing in backlog.')).toBeVisible()
    await expect(dayCard.getByText(seed.place_name)).toBeVisible()

    await planner.getByRole('button', { name: 'Move' }).first().click()
    await expect(movePicker).toBeVisible()
    const patchToDone = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Done' }).click()
    await patchToDone
    await expect(movePicker).toBeHidden()

    const doneHeading = planner.getByRole('heading', { name: 'Done' })
    const doneSection = doneHeading.locator('..').locator('..')
    const doneRow = doneSection.getByText(seed.place_name)
    const doneVisible = await doneRow.isVisible().catch(() => false)
    if (!doneVisible) {
      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)
    }
    await expect(doneSection.getByText(seed.place_name)).toBeVisible()
    await expect(dayCard.getByText(seed.place_name)).toBeHidden()

    await doneSection.getByRole('button', { name: 'Move' }).click()
    await expect(movePicker).toBeVisible()
    const patchToBacklog = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Backlog' }).click()
    await patchToBacklog
    await expect(movePicker).toBeHidden()

    const backlogHeading = planner.getByRole('heading', { name: 'Backlog' })
    const backlogSection = backlogHeading.locator('..').locator('..')
    await expect(backlogSection.getByText(seed.place_name)).toBeVisible()
    await expect(doneSection.getByText('Nothing done yet.')).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})
