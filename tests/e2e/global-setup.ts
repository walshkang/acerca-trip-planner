import fs from 'node:fs'
import { request } from '@playwright/test'

const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? 'playwright/.auth/user.json'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default async function globalSetup() {
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
