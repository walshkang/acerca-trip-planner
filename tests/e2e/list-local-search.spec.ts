import { test, expect, type Page } from '@playwright/test'

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

test('list detail local search adds approved places', async ({ page }) => {
  await page.goto('/')
  await ensureSignedIn(page)

  const seedA = await seedListWithPlace(page)
  const seedB = await seedListWithPlace(page)

  await page.goto(`/lists/${seedA.list.id}`)

  const searchInput = page.getByPlaceholder('Search approved places')
  await expect(searchInput).toBeVisible()
  await searchInput.fill(seedB.place_name)

  const resultName = page.getByText(seedB.place_name)
  await expect(resultName).toBeVisible()

  const resultCard = resultName.locator('..').locator('..').locator('..')
  await expect(resultCard.getByText('Approved')).toBeVisible()
  await resultCard.getByRole('button', { name: 'Add' }).click()

  await expect(resultCard.getByRole('button', { name: 'Added' })).toBeVisible()

  const placesSection = page
    .getByRole('heading', { name: 'Places' })
    .locator('..')
  await expect(placesSection.getByText(seedB.place_name)).toBeVisible()
})
