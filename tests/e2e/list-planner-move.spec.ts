import { test, expect, type Page } from '@playwright/test'

test.skip(true, 'Playwright seeded E2E is temporarily descoped.')

async function ensureSignedIn(page: Page) {
  const loadingText = page.getByText('Loading map...')
  await loadingText.waitFor({ state: 'detached' }).catch(() => null)

  const signOut = page.getByRole('button', { name: 'Sign out' })
  try {
    await signOut.waitFor({ state: 'visible', timeout: 15000 })
    return
  } catch {
    const signIn = page.getByRole('link', { name: 'Sign in' })
    const isSignedOut = await signIn.isVisible().catch(() => false)
    if (isSignedOut) {
      throw new Error(
        'Not signed in. Create playwright/.auth/user.json via: npx playwright codegen http://localhost:3000 --save-storage=playwright/.auth/user.json'
      )
    }
    throw new Error('Sign out button not visible. Map may still be loading.')
  }
}

async function seedListWithPlace(page: Page) {
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!seedToken) {
    throw new Error('PLAYWRIGHT_SEED_TOKEN is not set for Playwright seeding.')
  }

  const res = await page.request.post('/api/test/seed', {
    headers: { 'x-seed-token': seedToken },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Seed failed (${res.status()}): ${body}`)
  }
  const json = (await res.json()) as {
    list?: { id: string; name: string }
    place_id?: string
    place_name?: string
  }
  if (!json.list?.id || !json.place_id || !json.place_name) {
    throw new Error('Seed response missing list/place data')
  }
  return json
}

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

test('planner move picker schedules and completes list items', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seed = await seedListWithPlace(page)
  const today = new Date().toISOString().slice(0, 10)
  await setTripDates(page, seed.list.id, today)

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()
  await listDrawer.getByRole('button', { name: seed.list.name }).click()

  await page.getByRole('button', { name: 'Plan' }).click()
  const planner = page.getByTestId('list-planner')
  await expect(planner).toBeVisible()
  await expect(planner.getByText(seed.place_name)).toBeVisible()

  await planner.getByRole('button', { name: 'Move' }).first().click()
  const movePicker = page.getByTestId('planner-move-picker')
  await expect(movePicker).toBeVisible()
  await movePicker.getByRole('button', { name: 'Morning' }).click()
  await expect(movePicker).toBeHidden()

  await expect(planner.getByText('Nothing in backlog.')).toBeVisible()

  const dayHeading = planner.getByRole('heading', { name: today })
  const dayCard = dayHeading.locator('..').locator('..')
  await expect(dayCard.getByText(seed.place_name)).toBeVisible()

  await page.reload()
  await ensureSignedIn(page)
  await page.getByRole('button', { name: 'Lists' }).click()
  await expect(listDrawer).toBeVisible()
  await listDrawer.getByRole('button', { name: seed.list.name }).click()
  await page.getByRole('button', { name: 'Plan' }).click()
  await expect(planner.getByText('Nothing in backlog.')).toBeVisible()
  await expect(dayCard.getByText(seed.place_name)).toBeVisible()

  await planner.getByRole('button', { name: 'Move' }).first().click()
  await expect(movePicker).toBeVisible()
  await movePicker.getByRole('button', { name: 'Done' }).click()
  await expect(movePicker).toBeHidden()

  const doneHeading = planner.getByRole('heading', { name: 'Done' })
  const doneSection = doneHeading.locator('..').locator('..')
  await expect(doneSection.getByText(seed.place_name)).toBeVisible()
  await expect(dayCard.getByText(seed.place_name)).toBeHidden()

  await doneSection.getByRole('button', { name: 'Move' }).click()
  await expect(movePicker).toBeVisible()
  await movePicker.getByRole('button', { name: 'Backlog' }).click()
  await expect(movePicker).toBeHidden()

  const backlogHeading = planner.getByRole('heading', { name: 'Backlog' })
  const backlogSection = backlogHeading.locator('..').locator('..')
  await expect(backlogSection.getByText(seed.place_name)).toBeVisible()
  await expect(doneSection.getByText('Nothing done yet.')).toBeVisible()
})
