import { test, expect, type APIResponse, type Locator, type Page } from '@playwright/test'

import {
  addPlaceToList,
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

function plannerSectionByHeading(planner: Locator, heading: string) {
  return planner.getByRole('heading', { name: heading, exact: true }).locator('..').locator('..')
}

function plannerDayCard(planner: Locator, isoDate: string) {
  return plannerSectionByHeading(planner, isoDate)
}

function plannerSlotLane(dayCard: Locator, slotLabel: 'Morning' | 'Afternoon' | 'Evening') {
  return dayCard.getByText(slotLabel, { exact: true }).first().locator('..')
}

function draggableCardByPlaceName(root: Locator, placeName: string) {
  return root.locator('div[draggable="true"]').filter({ hasText: placeName }).first()
}

async function expectDragPatch(patchResponse: Promise<APIResponse>) {
  const response = await patchResponse
  const requestBody = response.request().postDataJSON() as Record<string, unknown> | null
  expect(requestBody?.source).toBe('drag')

  const responseJson = (await response.json().catch(() => ({}))) as {
    item?: { last_scheduled_source?: string | null }
  }
  expect(responseJson.item?.last_scheduled_source).toBe('drag')
}

type ListItemApiRow = {
  scheduled_date: string | null
  scheduled_start_time: string | null
  place: { id: string; name: string; category: string } | null
}

async function fetchListItems(page: Page, listId: string): Promise<ListItemApiRow[]> {
  const response = await page.request.get(`/api/lists/${listId}/items?limit=200`)
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`Failed to fetch list items (${response.status()}): ${body}`)
  }
  const json = (await response.json().catch(() => ({}))) as {
    items?: ListItemApiRow[]
  }
  return json.items ?? []
}

async function lanePlaceNames(lane: Locator) {
  const names = await lane.locator('p.truncate.text-sm.font-medium').allTextContents()
  return names.map((name) => name.trim()).filter((name) => name.length > 0)
}

async function expectPlaceBeforeInLane(lane: Locator, before: string, after: string) {
  await expect
    .poll(async () => {
      const names = await lanePlaceNames(lane)
      const beforeIndex = names.indexOf(before)
      const afterIndex = names.indexOf(after)
      if (beforeIndex < 0 || afterIndex < 0) return false
      return beforeIndex < afterIndex
    })
    .toBe(true)
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

test.describe('desktop dnd planner', () => {
  test.use({
    viewport: { width: 1366, height: 900 },
    hasTouch: false,
  })

  test('desktop drag from backlog to slot persists and records drag source', async ({
    page,
  }) => {
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

      const backlogSection = plannerSectionByHeading(planner, 'Backlog')
      const backlogCard = draggableCardByPlaceName(backlogSection, seed.place_name)
      await expect(backlogCard).toHaveAttribute('draggable', 'true')

      const dayCard = plannerDayCard(planner, today)
      const morningLane = plannerSlotLane(dayCard, 'Morning')
      await morningLane.scrollIntoViewIfNeeded()

      const patchResponse = waitForPlannerPatch(page, seed.list.id)
      await backlogCard.dragTo(morningLane)
      await expectDragPatch(patchResponse)

      await expect(backlogSection.getByText(seed.place_name)).toBeHidden()
      await expect(dayCard.getByText(seed.place_name)).toBeVisible()

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visibleByTestId(page, 'list-planner')
      const reloadedBacklog = plannerSectionByHeading(reloadedPlanner, 'Backlog')
      const reloadedDayCard = plannerDayCard(reloadedPlanner, today)
      await expect(reloadedBacklog.getByText(seed.place_name)).toBeHidden()
      await expect(reloadedDayCard.getByText(seed.place_name)).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('desktop drag reorder within slot persists', async ({ page }) => {
    await page.goto('/')
    await ensureSignedIn(page)

    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      const seedA = await seedListWithPlace(page)
      const seedB = await seedListWithPlace(page)
      seeds.push(seedA, seedB)

      await addPlaceToList(page, seedA.list.id, seedB.place_id)

      const today = new Date().toISOString().slice(0, 10)
      await setTripDates(page, seedA.list.id, today)
      await page.goto(`/?list=${encodeURIComponent(seedA.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visibleByTestId(page, 'list-planner')
      await expect(planner).toBeVisible()

      const backlogSection = plannerSectionByHeading(planner, 'Backlog')
      const backlogCardA = draggableCardByPlaceName(backlogSection, seedA.place_name)
      const backlogCardB = draggableCardByPlaceName(backlogSection, seedB.place_name)
      await expect(backlogCardA).toHaveAttribute('draggable', 'true')
      await expect(backlogCardB).toHaveAttribute('draggable', 'true')

      const dayCard = plannerDayCard(planner, today)
      const morningLane = plannerSlotLane(dayCard, 'Morning')
      await morningLane.scrollIntoViewIfNeeded()

      const patchToMorningA = waitForPlannerPatch(page, seedA.list.id)
      await backlogCardA.dragTo(morningLane)
      await expectDragPatch(patchToMorningA)

      const patchToMorningB = waitForPlannerPatch(page, seedA.list.id)
      await backlogCardB.dragTo(morningLane)
      await expectDragPatch(patchToMorningB)

      const seededItems = await fetchListItems(page, seedA.list.id)
      const itemA = seededItems.find((item) => item.place?.id === seedA.place_id)
      const itemB = seededItems.find((item) => item.place?.id === seedB.place_id)

      if (!itemA || !itemB) {
        throw new Error('Expected both seeded places to exist in list items for reorder test.')
      }
      if (!itemA.place?.category || !itemB.place?.category) {
        throw new Error('Expected both seeded places to include category metadata.')
      }
      if (itemA.place.category !== itemB.place.category) {
        throw new Error(
          `Expected same category for in-slot reorder test, received ${itemA.place.category} and ${itemB.place.category}.`
        )
      }

      await expectPlaceBeforeInLane(morningLane, seedA.place_name, seedB.place_name)

      const morningCardA = draggableCardByPlaceName(morningLane, seedA.place_name)
      const morningCardB = draggableCardByPlaceName(morningLane, seedB.place_name)
      const reorderPatch = waitForPlannerPatch(page, seedA.list.id)
      await morningCardB.dragTo(morningCardA)
      await expectDragPatch(reorderPatch)

      await expectPlaceBeforeInLane(morningLane, seedB.place_name, seedA.place_name)

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visibleByTestId(page, 'list-planner')
      const reloadedDayCard = plannerDayCard(reloadedPlanner, today)
      const reloadedMorningLane = plannerSlotLane(reloadedDayCard, 'Morning')
      await expectPlaceBeforeInLane(
        reloadedMorningLane,
        seedB.place_name,
        seedA.place_name
      )

      const reloadedItems = await fetchListItems(page, seedA.list.id)
      const morningIds = reloadedItems
        .filter(
          (item) =>
            item.scheduled_date === today &&
            typeof item.scheduled_start_time === 'string' &&
            item.scheduled_start_time.startsWith('09:00') &&
            (item.place?.id === seedA.place_id || item.place?.id === seedB.place_id)
        )
        .map((item) => item.place?.id)

      expect(morningIds).toEqual([seedB.place_id, seedA.place_id])
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })
})
