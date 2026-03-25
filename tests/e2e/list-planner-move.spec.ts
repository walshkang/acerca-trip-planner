import {
  test,
  expect,
  type APIResponse,
  type Locator,
  type Page,
  type Request,
} from '@playwright/test'

import {
  addPlaceToList,
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
  setTripDates,
  visibleByTestId,
  visiblePlanSurface,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

const NY_TZ = 'America/New_York'

async function openPlanTab(page: Page) {
  const paperItinerary = page.getByTestId('paper-header-tab-itinerary')
  if (await paperItinerary.isVisible()) {
    await paperItinerary.click()
    return
  }
  const rail = page.getByTestId('nav-rail')
  const footer = page.getByTestId('nav-footer')
  if (await rail.isVisible()) {
    await rail.getByRole('button', { name: 'Plan' }).click()
  } else {
    await footer.getByRole('button', { name: 'Plan' }).click()
  }
}

function waitForPlannerPatch(page: Page, listId: string, timeout = 20_000) {
  return page.waitForResponse(
    (res) => {
      return (
        res.request().method() === 'PATCH' &&
        res.url().includes(`/api/lists/${listId}/items/`) &&
        res.ok()
      )
    },
    { timeout }
  )
}

function waitForPlannerPatchRequest(page: Page, listId: string, timeout = 20_000) {
  return page.waitForRequest(
    (req) =>
      req.method() === 'PATCH' &&
      req.url().includes(`/api/lists/${listId}/items/`),
    { timeout }
  )
}

// ── New day-grid selectors ──

function plannerDayCell(planner: Locator, isoDate: string) {
  return planner.locator(`[data-testid="planner-day-cell"][data-day="${isoDate}"]`)
}

function plannerBacklog(planner: Locator) {
  return planner.getByTestId('planner-backlog')
}

function plannerDoneSection(planner: Locator) {
  return planner.getByRole('heading', { name: 'Done', exact: true }).locator('..').locator('..')
}

function draggableCardByPlaceName(root: Locator, placeName: string) {
  return root.locator('div[draggable="true"]').filter({ hasText: placeName }).first()
}

async function expandDoneSection(planner: Locator) {
  const doneHeading = planner.getByRole('heading', { name: 'Done', exact: true })
  const expandBtn = doneHeading.locator('..')
  await expandBtn.click()
}

async function expectDragPatch(patchResponse: Promise<APIResponse>) {
  const response = await patchResponse
  const requestBody = response.request().postDataJSON() as Record<string, unknown> | null
  expect(requestBody?.source).toBe('drag')

  const responseJson = (await response.json().catch(() => ({}))) as {
    item?: {
      last_scheduled_source?: string | null
      completed_at?: string | null
    }
  }
  expect(responseJson.item?.last_scheduled_source).toBe('drag')
  return {
    requestBody,
    responseItem: responseJson.item ?? null,
  }
}

async function expectDragRequest(
  patchRequest: Promise<Request>
): Promise<Record<string, unknown> | null> {
  const request = await patchRequest
  const requestBody = request.postDataJSON() as Record<string, unknown> | null
  expect(requestBody?.source).toBe('drag')
  return requestBody
}

type ListItemApiRow = {
  id: string
  scheduled_date: string | null
  scheduled_start_time: string | null
  scheduled_order: number | null
  completed_at: string | null
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

async function waitForBacklogPersistence(
  page: Page,
  listId: string,
  placeId: string
) {
  await expect
    .poll(
      async () => {
        const items = await fetchListItems(page, listId)
        const item = items.find((row) => row.place?.id === placeId)
        if (!item) return null
        return {
          scheduled_date: item.scheduled_date,
          scheduled_start_time: item.scheduled_start_time,
          completed_at: item.completed_at,
          scheduled_order: item.scheduled_order,
        }
      },
      { timeout: 15_000 }
    )
    .toEqual({
      scheduled_date: null,
      scheduled_start_time: null,
      completed_at: null,
      scheduled_order: 0,
    })
}

/** Get place names from the day detail view or backlog items. */
async function detailPlaceNames(container: Locator) {
  const names = await container.locator('p.truncate.text-xs.font-medium').allTextContents()
  return names.map((name) => name.trim()).filter((name) => name.length > 0)
}

async function expectPlaceBeforeInDetail(container: Locator, before: string, after: string) {
  await expect
    .poll(async () => {
      const names = await detailPlaceNames(container)
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
    await setTripDates(page, seed.list.id, {
      start_date: today,
      end_date: today,
      timezone: NY_TZ,
    })
    await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
    await ensureSignedIn(page)

    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()

    await openPlanTab(page)
    const planner = visiblePlanSurface(page)
    await expect(planner).toBeVisible()
    await expect(planner.getByText(seed.place_name)).toBeVisible()

    // Open move picker and move to today via the day button
    await planner.getByRole('button', { name: 'Move' }).first().click()
    const movePicker = page.getByTestId('planner-move-picker')
    await expect(movePicker).toBeVisible()
    const patchToDay = waitForPlannerPatch(page, seed.list.id)
    // Click the day button in the move picker's trip-day grid
    const dayButtons = movePicker.locator('button').filter({ hasText: /\w{3}\s\d+/ })
    await dayButtons.first().click()
    await patchToDay
    await expect(movePicker).toBeHidden()

    await expect(planner.getByText('Nothing in backlog.')).toBeVisible()

    // Verify item is in the day cell
    const dayCell = plannerDayCell(planner, today)
    await expect(dayCell.getByText(seed.place_name)).toBeVisible()

    await page.reload()
    await ensureSignedIn(page)
    await expect(listDrawer).toBeVisible()
    await openPlanTab(page)
    await expect(planner.getByText('Nothing in backlog.')).toBeVisible()
    await expect(dayCell.getByText(seed.place_name)).toBeVisible()

    // Open move picker and move to Done
    await planner.getByRole('button', { name: 'Move' }).first().click()
    await expect(movePicker).toBeVisible()
    const patchToDone = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Done' }).click()
    await patchToDone
    await expect(movePicker).toBeHidden()

    // Expand Done section (collapsed by default) and verify
    await expandDoneSection(planner)
    const doneSection = plannerDoneSection(planner)
    const doneRow = doneSection.getByText(seed.place_name)
    const doneVisible = await doneRow.isVisible().catch(() => false)
    if (!doneVisible) {
      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)
      await expandDoneSection(planner)
    }
    await expect(doneSection.getByText(seed.place_name)).toBeVisible()
    await expect(dayCell.getByText(seed.place_name)).toBeHidden()

    // Move from Done back to Backlog
    await doneSection.getByRole('button', { name: 'Move' }).click()
    await expect(movePicker).toBeVisible()
    const patchToBacklog = waitForPlannerPatch(page, seed.list.id)
    await movePicker.getByRole('button', { name: 'Backlog' }).click()
    await patchToBacklog
    await expect(movePicker).toBeHidden()

    await waitForBacklogPersistence(page, seed.list.id, seed.place_id)

    await page.reload()
    await ensureSignedIn(page)
    await expect(listDrawer).toBeVisible()
    await openPlanTab(page)

    const reloadedPlanner = visiblePlanSurface(page)
    const reloadedBacklog = plannerBacklog(reloadedPlanner)
    await expect(reloadedBacklog.getByText(seed.place_name)).toBeVisible()
    await expandDoneSection(reloadedPlanner)
    const reloadedDone = plannerDoneSection(reloadedPlanner)
    await expect(reloadedDone.getByText('Nothing done yet.')).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

// Slice 3: Paper desktop CalendarPlanner includes DnD + day-detail panel; this suite remains skipped until re-enabled for desktop.
test.describe.skip('desktop dnd planner', () => {
  test.use({
    viewport: { width: 1366, height: 900 },
    hasTouch: false,
  })

  test('desktop drag from backlog to day cell persists and records drag source', async ({
    page,
  }) => {
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
        timezone: NY_TZ,
      })
      await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      const backlog = plannerBacklog(planner)
      const backlogCard = draggableCardByPlaceName(backlog, seed.place_name)
      await expect(backlogCard).toHaveAttribute('draggable', 'true')

      const dayCell = plannerDayCell(planner, today)
      await dayCell.scrollIntoViewIfNeeded()

      const patchResponse = waitForPlannerPatch(page, seed.list.id)
      await backlogCard.dragTo(dayCell)
      await expectDragPatch(patchResponse)

      await expect(backlog.getByText(seed.place_name)).toBeHidden()
      await expect(dayCell.getByText(seed.place_name)).toBeVisible()

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visiblePlanSurface(page)
      const reloadedBacklog = plannerBacklog(reloadedPlanner)
      const reloadedDayCell = plannerDayCell(reloadedPlanner, today)
      await expect(reloadedBacklog.getByText(seed.place_name)).toBeHidden()
      await expect(reloadedDayCell.getByText(seed.place_name)).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('desktop drag reorder within day detail persists', async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000)
    await page.goto('/')
    await ensureSignedIn(page)

    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      const seedA = await seedListWithPlace(page)
      const seedB = await seedListWithPlace(page)
      seeds.push(seedA, seedB)

      await addPlaceToList(page, seedA.list.id, seedB.place_id)

      const today = new Date().toISOString().slice(0, 10)
      await setTripDates(page, seedA.list.id, {
        start_date: today,
        end_date: today,
        timezone: NY_TZ,
      })
      await page.goto(`/?list=${encodeURIComponent(seedA.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      const backlog = plannerBacklog(planner)
      const backlogCardA = draggableCardByPlaceName(backlog, seedA.place_name)
      const backlogCardB = draggableCardByPlaceName(backlog, seedB.place_name)
      await expect(backlogCardA).toHaveAttribute('draggable', 'true')
      await expect(backlogCardB).toHaveAttribute('draggable', 'true')

      // Drag both items to the day cell
      const dayCell = plannerDayCell(planner, today)
      await dayCell.scrollIntoViewIfNeeded()

      const patchA = waitForPlannerPatch(page, seedA.list.id)
      await backlogCardA.dragTo(dayCell)
      await expectDragPatch(patchA)

      const patchB = waitForPlannerPatch(page, seedA.list.id)
      await backlogCardB.dragTo(dayCell)
      await expectDragPatch(patchB)

      // Click the day cell to open day detail view
      await dayCell.click()

      // Wait for the detail view to appear (it shows the full day heading)
      const detailView = planner.locator('.space-y-1').first()
      await expect(detailView).toBeVisible()

      const scheduledNames = await detailPlaceNames(planner)
      const seedAIndex = scheduledNames.indexOf(seedA.place_name)
      const seedBIndex = scheduledNames.indexOf(seedB.place_name)
      if (seedAIndex < 0 || seedBIndex < 0) {
        throw new Error(
          `Expected both places in day detail, saw: ${scheduledNames.join(', ')}`
        )
      }

      const leadingSeed = seedAIndex < seedBIndex ? seedA : seedB
      const trailingSeed = seedAIndex < seedBIndex ? seedB : seedA

      const leadingCard = draggableCardByPlaceName(planner, leadingSeed.place_name)
      const reorderPatch = waitForPlannerPatch(page, seedA.list.id)
      await leadingCard.dragTo(detailView)
      await expectDragPatch(reorderPatch)

      await expectPlaceBeforeInDetail(
        planner,
        trailingSeed.place_name,
        leadingSeed.place_name
      )

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visiblePlanSurface(page)
      // Click day cell to open detail again
      const reloadedDayCell = plannerDayCell(reloadedPlanner, today)
      await reloadedDayCell.click()

      await expectPlaceBeforeInDetail(
        reloadedPlanner,
        trailingSeed.place_name,
        leadingSeed.place_name
      )

      const reloadedItems = await fetchListItems(page, seedA.list.id)
      const dayItemIds = reloadedItems
        .filter(
          (item) =>
            item.scheduled_date === today &&
            (item.place?.id === seedA.place_id || item.place?.id === seedB.place_id)
        )
        .map((item) => item.place?.id)

      expect(dayItemIds).toEqual([trailingSeed.place_id, leadingSeed.place_id])
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('desktop drag from day cell to done persists and records drag source', async ({
    page,
  }) => {
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
        timezone: NY_TZ,
      })
      await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      const backlog = plannerBacklog(planner)
      const backlogCard = draggableCardByPlaceName(backlog, seed.place_name)
      await expect(backlogCard).toHaveAttribute('draggable', 'true')

      // Drag to day cell
      const dayCell = plannerDayCell(planner, today)
      await dayCell.scrollIntoViewIfNeeded()

      const patchToDay = waitForPlannerPatch(page, seed.list.id)
      await backlogCard.dragTo(dayCell)
      await expectDragPatch(patchToDay)

      // Now drag from the day cell to Done
      // First, expand Done section
      await expandDoneSection(planner)

      const dayCard = draggableCardByPlaceName(dayCell, seed.place_name)
      await expect(dayCard).toHaveAttribute('draggable', 'true')

      const doneSection = plannerDoneSection(planner)
      const patchToDone = waitForPlannerPatch(page, seed.list.id)
      await dayCard.dragTo(doneSection)
      const donePatch = await expectDragPatch(patchToDone)
      expect(donePatch.responseItem?.completed_at).toBeTruthy()

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visiblePlanSurface(page)
      await expandDoneSection(reloadedPlanner)
      const reloadedDone = plannerDoneSection(reloadedPlanner)
      const reloadedDayCell = plannerDayCell(reloadedPlanner, today)
      await expect(reloadedDone.getByText(seed.place_name)).toBeVisible()
      await expect(reloadedDayCell.getByText(seed.place_name)).toBeHidden()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('desktop drag from done to backlog clears scheduling and completion', async ({
    page,
  }) => {
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
        timezone: NY_TZ,
      })
      await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      // Drag to day cell first
      const backlog = plannerBacklog(planner)
      const backlogCard = draggableCardByPlaceName(backlog, seed.place_name)
      await expect(backlogCard).toHaveAttribute('draggable', 'true')

      const dayCell = plannerDayCell(planner, today)
      await dayCell.scrollIntoViewIfNeeded()

      const patchToDay = waitForPlannerPatch(page, seed.list.id)
      await backlogCard.dragTo(dayCell)
      await expectDragPatch(patchToDay)

      // Mark done via API
      const seededItems = await fetchListItems(page, seed.list.id)
      const seededItem = seededItems.find((item) => item.place?.id === seed.place_id)
      if (!seededItem?.id) {
        throw new Error('Expected seeded list item before Done -> Backlog drag.')
      }
      const markDoneRes = await page.request.patch(
        `/api/lists/${seed.list.id}/items/${seededItem.id}`,
        {
          headers: { 'content-type': 'application/json' },
          data: { completed: true, source: 'api' },
        }
      )
      if (!markDoneRes.ok()) {
        const body = await markDoneRes.text().catch(() => '')
        throw new Error(`Failed to mark item done (${markDoneRes.status()}): ${body}`)
      }

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const rehydratedPlanner = visiblePlanSurface(page)
      await expandDoneSection(rehydratedPlanner)
      const doneSection = plannerDoneSection(rehydratedPlanner)
      await expect(doneSection.getByText(seed.place_name)).toBeVisible()

      const doneCard = draggableCardByPlaceName(doneSection, seed.place_name)
      await expect(doneCard).toHaveAttribute('draggable', 'true')

      const backlogTarget = plannerBacklog(rehydratedPlanner)
      await backlogTarget.scrollIntoViewIfNeeded()

      let backlogRequestBody: Record<string, unknown> | null = null
      for (const force of [false, true]) {
        const patchToBacklog = waitForPlannerPatchRequest(page, seed.list.id, 6_000)
        const draggableDoneCard = draggableCardByPlaceName(doneSection, seed.place_name)
        await draggableDoneCard.dragTo(backlogTarget, { force })
        try {
          backlogRequestBody = await expectDragRequest(patchToBacklog)
          break
        } catch (error) {
          if (force) throw error
        }
      }

      if (!backlogRequestBody) {
        throw new Error('Expected Done -> Backlog drag to send a planner PATCH request.')
      }

      expect(backlogRequestBody?.completed).toBe(false)
      expect(backlogRequestBody?.scheduled_date).toBeNull()
      expect(backlogRequestBody?.slot).toBeNull()

      await waitForBacklogPersistence(page, seed.list.id, seed.place_id)

      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visiblePlanSurface(page)
      const reloadedBacklog = plannerBacklog(reloadedPlanner)
      await expect(reloadedBacklog.getByText(seed.place_name)).toBeVisible()
      await expandDoneSection(reloadedPlanner)
      const reloadedDone = plannerDoneSection(reloadedPlanner)
      await expect(reloadedDone.getByText(seed.place_name)).toBeHidden()

      await waitForBacklogPersistence(page, seed.list.id, seed.place_id)
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('selecting a day cell shows the detail panel', async ({ page }) => {
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
        timezone: NY_TZ,
      })
      await page.goto(`/?list=${encodeURIComponent(seed.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      // Move item to today via API
      const items = await fetchListItems(page, seed.list.id)
      const item = items.find((row) => row.place?.id === seed.place_id)
      if (!item?.id) throw new Error('Expected seeded item')
      await page.request.patch(
        `/api/lists/${seed.list.id}/items/${item.id}`,
        {
          headers: { 'content-type': 'application/json' },
          data: { scheduled_date: today, slot: 'morning', source: 'api' },
        }
      )
      await page.reload()
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const reloadedPlanner = visiblePlanSurface(page)
      const dayCell = plannerDayCell(reloadedPlanner, today)
      await expect(dayCell.getByText(seed.place_name)).toBeVisible()

      // Click the day cell to select it
      await dayCell.click()

      // Verify the detail panel shows the place
      // The detail view shows the back button "← Grid" and the place name
      await expect(reloadedPlanner.getByText('← Grid')).toBeVisible()
      await expect(reloadedPlanner.getByRole('button', { name: 'Move' })).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('day cell shows item count and names', async ({ page }) => {
    await page.goto('/')
    await ensureSignedIn(page)

    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      const seedA = await seedListWithPlace(page)
      const seedB = await seedListWithPlace(page)
      seeds.push(seedA, seedB)

      await addPlaceToList(page, seedA.list.id, seedB.place_id)

      const today = new Date().toISOString().slice(0, 10)
      await setTripDates(page, seedA.list.id, {
        start_date: today,
        end_date: today,
        timezone: NY_TZ,
      })

      // Schedule both items via API
      const items = await fetchListItems(page, seedA.list.id)
      for (const item of items) {
        await page.request.patch(
          `/api/lists/${seedA.list.id}/items/${item.id}`,
          {
            headers: { 'content-type': 'application/json' },
            data: { scheduled_date: today, slot: 'morning', source: 'api' },
          }
        )
      }

      await page.goto(`/?list=${encodeURIComponent(seedA.list.id)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()

      await openPlanTab(page)
      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      const dayCell = plannerDayCell(planner, today)
      // Verify both place names are visible in the cell
      await expect(dayCell.getByText(seedA.place_name)).toBeVisible()
      await expect(dayCell.getByText(seedB.place_name)).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })

  test('trip date shift preserves day-relative schedule; trim moves out-of-range to backlog', async ({
    page,
  }) => {
    const tripStart = '2026-03-23'
    const tripEndInitial = '2026-03-27'
    const day1 = '2026-03-23'
    const day3 = '2026-03-25'
    const tripStartShifted = '2026-03-25'
    const tripEndShifted = '2026-03-29'
    const day1AfterShift = '2026-03-25'
    const day3AfterShift = '2026-03-27'
    const tripEndTrimmed = '2026-03-26'

    await page.goto('/')
    await ensureSignedIn(page)

    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      const seedA = await seedListWithPlace(page)
      const seedB = await seedListWithPlace(page)
      seeds.push(seedA, seedB)

      await addPlaceToList(page, seedA.list.id, seedB.place_id)
      const listId = seedA.list.id

      await setTripDates(page, listId, {
        start_date: tripStart,
        end_date: tripEndInitial,
        timezone: NY_TZ,
      })

      await page.goto(`/?list=${encodeURIComponent(listId)}`)
      await ensureSignedIn(page)

      const listDrawer = visibleByTestId(page, 'list-drawer')
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const planner = visiblePlanSurface(page)
      await expect(planner).toBeVisible()

      const backlog = plannerBacklog(planner)
      const cellDay1 = plannerDayCell(planner, day1)
      const cellDay3 = plannerDayCell(planner, day3)
      await cellDay1.scrollIntoViewIfNeeded()
      await cellDay3.scrollIntoViewIfNeeded()

      const cardA = draggableCardByPlaceName(backlog, seedA.place_name)
      const cardB = draggableCardByPlaceName(backlog, seedB.place_name)

      const patchA = waitForPlannerPatch(page, listId)
      await cardA.dragTo(cellDay1)
      await expectDragPatch(patchA)

      const patchB = waitForPlannerPatch(page, listId)
      await cardB.dragTo(cellDay3)
      await expectDragPatch(patchB)

      await expect(backlog.getByText(seedA.place_name)).toBeHidden()
      await expect(backlog.getByText(seedB.place_name)).toBeHidden()

      const shiftRes = await page.request.patch(`/api/lists/${listId}`, {
        headers: { 'content-type': 'application/json' },
        data: {
          start_date: tripStartShifted,
          end_date: tripEndShifted,
          timezone: NY_TZ,
        },
      })
      expect(shiftRes.ok()).toBe(true)
      const shiftJson = (await shiftRes.json()) as {
        list?: { start_date?: string | null; end_date?: string | null }
      }
      expect(shiftJson.list?.start_date).toBe(tripStartShifted)
      expect(shiftJson.list?.end_date).toBe(tripEndShifted)

      const itemsAfterShift = await fetchListItems(page, listId)
      const rowA = itemsAfterShift.find((r) => r.place?.id === seedA.place_id)
      const rowB = itemsAfterShift.find((r) => r.place?.id === seedB.place_id)
      expect(rowA?.scheduled_date).toBe(day1AfterShift)
      expect(rowB?.scheduled_date).toBe(day3AfterShift)

      await page.goto(`/?list=${encodeURIComponent(listId)}`)
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const plannerAfterShift = visiblePlanSurface(page)
      const backlogAfterShift = plannerBacklog(plannerAfterShift)
      await expect(backlogAfterShift.getByText('Nothing in backlog.')).toBeVisible()
      await expect(
        plannerDayCell(plannerAfterShift, day1AfterShift).getByText(seedA.place_name)
      ).toBeVisible()
      await expect(
        plannerDayCell(plannerAfterShift, day3AfterShift).getByText(seedB.place_name)
      ).toBeVisible()

      const trimRes = await page.request.patch(`/api/lists/${listId}`, {
        headers: { 'content-type': 'application/json' },
        data: { end_date: tripEndTrimmed, timezone: NY_TZ },
      })
      expect(trimRes.ok()).toBe(true)
      const trimJson = (await trimRes.json()) as {
        list?: { end_date?: string | null }
      }
      expect(trimJson.list?.end_date).toBe(tripEndTrimmed)

      const itemsAfterTrim = await fetchListItems(page, listId)
      const rowAAfter = itemsAfterTrim.find((r) => r.place?.id === seedA.place_id)
      const rowBAfter = itemsAfterTrim.find((r) => r.place?.id === seedB.place_id)
      expect(rowAAfter?.scheduled_date).toBe(day1AfterShift)
      expect(rowBAfter?.scheduled_date).toBeNull()

      await page.goto(`/?list=${encodeURIComponent(listId)}`)
      await ensureSignedIn(page)
      await expect(listDrawer).toBeVisible()
      await openPlanTab(page)

      const plannerAfterTrim = visiblePlanSurface(page)
      await expect(
        plannerDayCell(plannerAfterTrim, day1AfterShift).getByText(seedA.place_name)
      ).toBeVisible()
      await expect(
        plannerAfterTrim.locator(
          `[data-testid="planner-day-cell"][data-day="${day3AfterShift}"]`
        )
      ).toHaveCount(0)

      const backlogAfterTrim = plannerBacklog(plannerAfterTrim)
      await expect(backlogAfterTrim.getByText(seedB.place_name)).toBeVisible()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })
})
