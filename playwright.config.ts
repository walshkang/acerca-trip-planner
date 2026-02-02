import { defineConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    if (!key || process.env[key] != null) continue
    const value = trimmed.slice(idx + 1).trim()
    process.env[key] = value
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const storageState =
  process.env.PLAYWRIGHT_STORAGE_STATE ?? 'playwright/.auth/user.json'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    storageState,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
