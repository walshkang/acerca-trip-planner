import fs from 'node:fs'
import type { APIResponse, Locator, Page } from '@playwright/test'

type SkipRegistrar = {
  skip: (condition: boolean, description?: string) => void
}

export type SeededListWithPlace = {
  list: { id: string; name: string }
  place_id: string
  place_name: string
}

const SIGN_IN_HELP =
  'Not signed in. Create playwright/.auth/user.json via: npx playwright codegen http://localhost:3000 --save-storage=playwright/.auth/user.json'

export const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? 'playwright/.auth/user.json'
export const hasStorageState = fs.existsSync(storageStatePath)
export const hasSeedToken = Boolean(process.env.PLAYWRIGHT_SEED_TOKEN)

export function applySeededPrerequisiteSkips(test: SkipRegistrar) {
  test.skip(!hasSeedToken, 'PLAYWRIGHT_SEED_TOKEN is required for seeded E2E.')
  test.skip(!hasStorageState, `Missing Playwright storage state: ${storageStatePath}`)
}

async function responseBody(response: APIResponse) {
  return response.text().catch(() => '')
}

export async function ensureSignedIn(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  const authProbe = await page.request.get('/api/lists')
  if (authProbe.status() === 401) {
    throw new Error(SIGN_IN_HELP)
  }
  if (!authProbe.ok()) {
    throw new Error(
      `Auth probe failed (${authProbe.status()}): ${await responseBody(authProbe)}`
    )
  }
}

export async function seedListWithPlace(page: Page): Promise<SeededListWithPlace> {
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!seedToken) {
    throw new Error('PLAYWRIGHT_SEED_TOKEN is not set for Playwright seeding.')
  }

  const res = await page.request.post('/api/test/seed', {
    headers: { 'x-seed-token': seedToken },
  })
  if (!res.ok()) {
    throw new Error(`Seed failed (${res.status()}): ${await responseBody(res)}`)
  }
  const json = (await res.json()) as {
    list?: { id: string; name: string }
    place_id?: string
    place_name?: string
  }
  if (!json.list?.id || !json.place_id || !json.place_name) {
    throw new Error('Seed response missing list/place data')
  }
  return json as SeededListWithPlace
}

export async function addPlaceToList(
  page: Page,
  listId: string,
  placeId: string,
  tags: string[] = []
) {
  const res = await page.request.post(`/api/lists/${listId}/items`, {
    headers: { 'content-type': 'application/json' },
    data: { place_id: placeId, tags },
  })
  if (!res.ok()) {
    throw new Error(
      `Failed to add place to list (${res.status()}): ${await responseBody(res)}`
    )
  }
}

export async function setListItemTags(
  page: Page,
  listId: string,
  placeId: string,
  tags: string[]
) {
  const itemsRes = await page.request.get(`/api/lists/${listId}/items?limit=200`)
  if (!itemsRes.ok()) {
    throw new Error(
      `Failed to fetch list items (${itemsRes.status()}): ${await responseBody(itemsRes)}`
    )
  }
  const json = (await itemsRes.json()) as {
    items?: Array<{ id: string; place?: { id?: string } | null }>
  }
  const item = (json.items ?? []).find((row) => row.place?.id === placeId)
  if (!item?.id) {
    throw new Error('List item not found for place')
  }

  const res = await page.request.patch(`/api/lists/${listId}/items/${item.id}/tags`, {
    headers: { 'content-type': 'application/json' },
    data: { tags },
  })
  if (!res.ok()) {
    throw new Error(
      `Failed to set list item tags (${res.status()}): ${await responseBody(res)}`
    )
  }
}

export function visibleByTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]:visible`).first()
}

export async function waitForPlaceDrawerReady(placeDrawer: Locator, placeName: string) {
  await placeDrawer.waitFor({ state: 'visible' })
  await placeDrawer.getByRole('heading', { name: placeName }).waitFor({ state: 'visible' })
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
