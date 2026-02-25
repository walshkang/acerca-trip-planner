import { randomUUID } from 'crypto'
import { test, expect, type Locator } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  escapeRegex,
  seedListWithPlace,
  visibleByTestId,
  waitForPlaceDrawerReady,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

const isPmtilesMode =
  process.env.NEXT_PUBLIC_MAP_PROVIDER !== 'mapbox' &&
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE === 'pmtiles'
const styleConsoleErrorPattern =
  /source-layer|layer .* does not exist|failed to load source|failed to load style|cannot parse style/i
const pmtilesFallbackNotice =
  'PMTiles tiles were unavailable. Switched to Carto style for this session.'

async function waitForMembershipApplied(
  placeDrawer: Locator,
  membershipButton: Locator
) {
  await expect(membershipButton).toHaveAttribute('aria-pressed', 'true')
  const tagInput = placeDrawer.getByPlaceholder('Add tags (comma-separated)')
  await expect(tagInput).toBeVisible()
  await expect(tagInput).toBeEnabled()
  return tagInput
}

test('pmtiles basemap loads tiles without style errors', async ({ page }) => {
  test.skip(
    !isPmtilesMode,
    'Requires NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE=pmtiles in MapLibre mode.'
  )

  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const pmtilesResponse = page.waitForResponse((response) => {
    return (
      response.url().includes('/map/nyc.pmtiles') &&
      (response.status() === 200 || response.status() === 206)
    )
  })

  await page.goto('/')
  await ensureSignedIn(page)
  await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible()
  await pmtilesResponse

  const styleErrors = consoleErrors.filter((message) =>
    styleConsoleErrorPattern.test(message)
  )
  expect(styleErrors).toEqual([])
})

test('pmtiles falls back to carto when archive fails during initial load', async ({
  page,
}) => {
  test.skip(
    !isPmtilesMode,
    'Requires NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE=pmtiles in MapLibre mode.'
  )

  await page.route('**/map/nyc.pmtiles**', (route) => route.abort('failed'))

  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await expect(page.getByText(pmtilesFallbackNotice)).toBeVisible()

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()
    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('pmtiles runtime failure after initial load falls back without breaking overlays', async ({
  page,
}) => {
  test.skip(
    !isPmtilesMode,
    'Requires NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE=pmtiles in MapLibre mode.'
  )

  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.waitForResponse((response) => {
      return (
        response.url().includes('/map/nyc.pmtiles') &&
        (response.status() === 200 || response.status() === 206)
      )
    })

    await page.route('**/map/nyc.pmtiles**', (route) => route.abort('failed'))

    await page.getByRole('button', { name: 'Tools' }).click()
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(page.getByText(pmtilesFallbackNotice)).toBeVisible()

    await page.getByLabel('Transit lines').check()
    await page.getByLabel('Neighborhoods').check()
    await page.getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()
    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer opens and tags are editable for active list', async ({ page }, testInfo) => {
  await page.goto('/')

  await ensureSignedIn(page)
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()

    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
    const placeButton = placesSection.getByRole('button', { name: seed.place_name })
    await expect(placeButton).toBeVisible()
    await placeButton.click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)

    const membershipButton = placeDrawer.getByRole('button', {
      name: new RegExp(escapeRegex(seed.list.name)),
    })
    const isSelected = await membershipButton
      .getAttribute('aria-pressed')
      .then((value) => value === 'true')
      .catch(() => false)
    if (!isSelected) {
      await membershipButton.click()
    }

    const tagInput = await waitForMembershipApplied(placeDrawer, membershipButton)
    const tagValue = `playwright-smoke-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`
    await tagInput.fill(tagValue)
    const listItemsResponse = page.waitForResponse((res) => {
      return (
        res.request().method() === 'GET' &&
        res.url().includes(`/api/lists/${seed.list.id}/items`) &&
        res.ok()
      )
    })
    await placeDrawer.getByRole('button', { name: 'Add' }).click()
    await listItemsResponse
    const tagSection = placeDrawer.getByText('List tags').locator('..')
    await expect(tagSection.getByText(tagValue)).toBeVisible()
    const placeRow = placeButton.locator('..').locator('..')
    await expect(placeRow.getByText(tagValue)).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer stays below inspector overlay', async ({ page }) => {
  await page.goto('/')

  await ensureSignedIn(page)
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()
    const placesSection = listDrawer.getByRole('heading', { name: 'Places' }).locator('..')
    const placeButton = placesSection.getByRole('button', { name: seed.place_name })
    await expect(placeButton).toBeVisible()
    await placeButton.click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    const rightOverlay = page.getByTestId('map-overlay-right')

    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
    await expect(rightOverlay).toBeVisible()

    const placeBox = await placeDrawer.boundingBox()
    const overlayBox = await rightOverlay.boundingBox()

    expect(placeBox && overlayBox).toBeTruthy()
    if (!placeBox || !overlayBox) return

    expect(placeBox.y).toBeGreaterThanOrEqual(overlayBox.y + overlayBox.height - 1)
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('place drawer URL supports deep link and back/forward', async ({ page }) => {
  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)
    const encodedPlaceId = encodeURIComponent(seed.place_id)

    await page.goto(`/?place=${encodedPlaceId}`)
    await ensureSignedIn(page)

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
    await expect(page).toHaveURL(new RegExp(`[?&]place=${encodedPlaceId}`))

    await placeDrawer.getByRole('button', { name: 'Close' }).click()
    await expect(placeDrawer).toBeHidden()
    await expect(page).toHaveURL(/\/$/)

    await page.goBack()
    await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
    await expect(page).toHaveURL(new RegExp(`[?&]place=${encodedPlaceId}`))

    await page.goForward()
    await expect(placeDrawer).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test('transit overlay does not block marker clicks', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
  try {
    const seed = await seedListWithPlace(page)
    seeds.push(seed)

    await page.getByRole('button', { name: 'Tools' }).click()
    const transitToggle = page.getByLabel('Transit lines')
    await transitToggle.check()
    await page.getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: 'Lists' }).click()
    const listDrawer = visibleByTestId(page, 'list-drawer')
    await expect(listDrawer).toBeVisible()
    await listDrawer.getByRole('button', { name: seed.list.name }).click()

    await page.getByRole('button', { name: `Open ${seed.place_name}` }).click()

    const placeDrawer = visibleByTestId(page, 'place-drawer')
    await expect(placeDrawer).toBeVisible()
    await expect(
      placeDrawer.getByRole('heading', { name: seed.place_name })
    ).toBeVisible()
  } finally {
    await cleanupSeededData(page, seeds)
  }
})

test.describe('mobile overlay hierarchy', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile deep-link mount keeps place visible and tools closed', async ({
    page,
  }) => {
    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      await page.goto('/')
      await ensureSignedIn(page)
      const seed = await seedListWithPlace(page)
      seeds.push(seed)

      await page.getByRole('button', { name: 'Tools' }).click()
      await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible()

      const encodedPlaceId = encodeURIComponent(seed.place_id)
      await page.goto(`/?place=${encodedPlaceId}`)
      await ensureSignedIn(page)

      const placeDrawer = visibleByTestId(page, 'place-drawer')
      await waitForPlaceDrawerReady(placeDrawer, seed.place_name)
      await expect(page.getByRole('heading', { name: 'Tools' })).toBeHidden()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })
})
