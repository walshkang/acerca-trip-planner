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

async function addPlaceToList(
  page: Page,
  listId: string,
  placeId: string,
  tags: string[]
) {
  const res = await page.request.post(`/api/lists/${listId}/items`, {
    headers: { 'content-type': 'application/json' },
    data: { place_id: placeId, tags },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to add place to list: ${res.status()} ${body}`)
  }
}

async function setListItemTags(
  page: Page,
  listId: string,
  placeId: string,
  tags: string[]
) {
  const itemsRes = await page.request.get(`/api/lists/${listId}/items?limit=200`)
  if (!itemsRes.ok()) {
    throw new Error(`Failed to fetch list items (${itemsRes.status()})`)
  }
  const json = (await itemsRes.json()) as {
    items?: Array<{ id: string; place?: { id?: string } | null }>
  }
  const item = (json.items ?? []).find((row) => row.place?.id === placeId)
  if (!item?.id) {
    throw new Error('List item not found for place')
  }

  const res = await page.request.patch(
    `/api/lists/${listId}/items/${item.id}/tags`,
    {
      headers: { 'content-type': 'application/json' },
      data: { tags },
    }
  )
  if (!res.ok()) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to set list item tags: ${res.status()} ${body}`)
  }
}

test('list tag filters work in list detail view', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seedA = await seedListWithPlace(page)
  const seedB = await seedListWithPlace(page)

  await addPlaceToList(page, seedA.list.id, seedB.place_id, ['brunch'])
  await setListItemTags(page, seedA.list.id, seedA.place_id, ['date-night'])

  await page.goto(`/lists/${seedA.list.id}`)

  const placesSection = page.getByRole('heading', { name: 'Places' }).locator('..')
  await expect(placesSection.getByText(seedA.place_name)).toBeVisible()
  await expect(placesSection.getByText(seedB.place_name)).toBeVisible()

  const tagsHeader = page.getByText('Tags', { exact: true })
  const tagsSection = tagsHeader.locator('..').locator('..').locator('..')
  const dateNightFilter = tagsSection.getByRole('button', { name: 'date-night' })
  await dateNightFilter.click()
  await expect(placesSection.getByText(seedA.place_name)).toBeVisible()
  await expect(placesSection.getByText(seedB.place_name)).toBeHidden()

  await tagsSection.getByRole('button', { name: 'Clear' }).click()
  await expect(placesSection.getByText(seedB.place_name)).toBeVisible()

  const brunchFilter = tagsSection.getByRole('button', { name: 'brunch' })
  await brunchFilter.click()
  await expect(placesSection.getByText(seedB.place_name)).toBeVisible()
  await expect(placesSection.getByText(seedA.place_name)).toBeHidden()
})

test('map marker click focuses list row and opens place drawer', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seed = await seedListWithPlace(page)

  await page.getByRole('button', { name: 'Lists' }).click()
  const listDrawer = page.getByTestId('list-drawer')
  await expect(listDrawer).toBeVisible()
  await listDrawer.getByRole('button', { name: seed.list.name }).click()

  const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
  await expect(placesSection.getByText(seed.place_name)).toBeVisible()

  await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()

  const placeDrawer = page.getByTestId('place-drawer')
  await expect(placeDrawer).toBeVisible()
  await expect(
    placeDrawer.getByRole('heading', { name: seed.place_name })
  ).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`[?&]place=${encodeURIComponent(seed.place_id)}`)
  )

  const focusedRow = listDrawer.locator(`[data-place-id="${seed.place_id}"]`)
  await expect(focusedRow).toBeVisible()
  await expect(focusedRow).toHaveClass(/ring-1/)
})
