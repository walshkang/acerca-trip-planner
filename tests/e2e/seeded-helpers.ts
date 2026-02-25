import fs from 'node:fs'
import { request, type APIResponse, type Locator, type Page } from '@playwright/test'

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
const CLEANUP_MAX_ATTEMPTS = 2
const CLEANUP_REQUEST_TIMEOUT_MS = 5_000
const FAIL_ON_CLEANUP_ERROR = process.env.PLAYWRIGHT_STRICT_CLEANUP === 'true'

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

export async function cleanupSeededData(
  page: Page,
  seeds: Array<SeededListWithPlace | null | undefined>
) {
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!seedToken) {
    throw new Error('PLAYWRIGHT_SEED_TOKEN is not set for Playwright cleanup.')
  }

  const listIds = Array.from(
    new Set(
      seeds
        .map((seed) => seed?.list.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )
  const placeIds = Array.from(
    new Set(
      seeds
        .map((seed) => seed?.place_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  if (listIds.length === 0 && placeIds.length === 0) return

  const pageUrl = page.url()
  const cleanupBaseUrl =
    pageUrl && pageUrl !== 'about:blank'
      ? new URL(pageUrl).origin
      : process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'

  let lastError = 'No cleanup attempt was made.'
  for (let attempt = 1; attempt <= CLEANUP_MAX_ATTEMPTS; attempt += 1) {
    const cleanupRequest = await request.newContext({
      baseURL: cleanupBaseUrl,
      storageState: storageStatePath,
      timeout: CLEANUP_REQUEST_TIMEOUT_MS,
    })
    try {
      const res = await cleanupRequest.delete('/api/test/seed', {
        headers: {
          'x-seed-token': seedToken,
          'content-type': 'application/json',
        },
        data: {
          list_ids: listIds,
          place_ids: placeIds,
        },
      })
      if (res.ok()) return
      lastError = `Cleanup failed (${res.status()}): ${await responseBody(res)}`
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error)
    } finally {
      await cleanupRequest.dispose()
    }

    if (attempt < CLEANUP_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }

  const message = `Cleanup failed after ${CLEANUP_MAX_ATTEMPTS} attempts: ${lastError}`
  if (FAIL_ON_CLEANUP_ERROR) {
    throw new Error(message)
  }
  console.warn(`[playwright seeded cleanup] ${message}`)
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
