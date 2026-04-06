import fs from 'node:fs'
import { request } from '@playwright/test'

const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? 'playwright/.auth/user.json'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3010'

async function isAuthValid(): Promise<boolean> {
  if (!fs.existsSync(storageStatePath)) return false
  const ctx = await request.newContext({ baseURL, storageState: storageStatePath })
  try {
    const res = await ctx.get('/api/lists', { timeout: 5_000 })
    return res.status() !== 401
  } catch {
    return false
  } finally {
    await ctx.dispose()
  }
}

/**
 * Headlessly sign in by calling /api/test/auth (which uses the Supabase admin
 * API to generate + verify an OTP server-side). No browser or email needed.
 * Also unlocks beta if BETA_ACCESS_PASSWORD is set.
 */
async function generateStorageState() {
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL
  const betaPassword = process.env.BETA_ACCESS_PASSWORD?.trim()

  if (!seedToken) {
    console.warn('[playwright auth] Missing PLAYWRIGHT_SEED_TOKEN — skipping auth setup')
    return
  }
  if (!testEmail) {
    console.warn('[playwright auth] Missing PLAYWRIGHT_TEST_EMAIL — skipping auth setup')
    return
  }

  const ctx = await request.newContext({ baseURL })
  try {
    // 1. Unlock beta first (middleware allows /api/beta-unlock without a cookie)
    if (betaPassword) {
      const betaRes = await ctx.post('/api/beta-unlock', {
        data: { password: betaPassword },
        headers: { 'content-type': 'application/json' },
      })
      if (betaRes.ok()) {
        console.log('[playwright beta] beta cookie acquired')
      } else {
        console.warn(`[playwright beta] beta-unlock failed (${betaRes.status()})`)
      }
    }

    // 2. Sign in via test endpoint (beta cookie from step 1 is included automatically)
    const authRes = await ctx.post('/api/test/auth', {
      data: { email: testEmail },
      headers: {
        'content-type': 'application/json',
        'x-seed-token': seedToken,
      },
    })

    if (!authRes.ok()) {
      const body = await authRes.text()
      console.warn(`[playwright auth] /api/test/auth failed (${authRes.status()}): ${body}`)
      return
    }

    fs.mkdirSync('playwright/.auth', { recursive: true })
    await ctx.storageState({ path: storageStatePath })
    console.log('[playwright auth] storage state saved to', storageStatePath)
  } finally {
    await ctx.dispose()
  }
}

/**
 * Refresh the beta cookie in an existing storage state so tests don't hit
 * beta_required when BETA_ACCESS_PASSWORD is set.
 */
async function refreshBetaCookie() {
  const betaPassword = process.env.BETA_ACCESS_PASSWORD?.trim()
  if (!betaPassword) return

  const ctx = await request.newContext({ baseURL, storageState: storageStatePath })
  try {
    const res = await ctx.post('/api/beta-unlock', {
      data: { password: betaPassword },
      headers: { 'content-type': 'application/json' },
    })
    if (res.ok()) {
      await ctx.storageState({ path: storageStatePath })
      console.log('[playwright beta] beta cookie refreshed')
    }
  } finally {
    await ctx.dispose()
  }
}

export default async function globalSetup() {
  if (!await isAuthValid()) {
    await generateStorageState()
  } else {
    await refreshBetaCookie()
  }

  // Seed cleanup
  const seedToken = process.env.PLAYWRIGHT_SEED_TOKEN
  if (!seedToken || !fs.existsSync(storageStatePath)) {
    return
  }

  const ctx = await request.newContext({
    baseURL,
    storageState: storageStatePath,
    timeout: 10_000,
  })
  try {
    const res = await ctx.delete('/api/test/seed', {
      headers: { 'x-seed-token': seedToken, 'content-type': 'application/json' },
      data: {},
    })
    if (res.ok()) {
      const json = (await res.json()) as {
        deleted_lists?: number
        deleted_places?: number
        deleted_place_candidates?: number
      }
      const { deleted_lists = 0, deleted_places = 0, deleted_place_candidates = 0 } = json
      if (deleted_lists > 0 || deleted_places > 0 || deleted_place_candidates > 0) {
        console.log(
          `[playwright sweep] deleted_lists=${deleted_lists} deleted_places=${deleted_places} deleted_place_candidates=${deleted_place_candidates}`
        )
      }
    }
  } finally {
    await ctx.dispose()
  }
}
