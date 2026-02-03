import { createBrowserClient } from '@supabase/ssr'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'

type CookieRecord = {
  value: string
  options?: {
    path?: string
    maxAge?: number
    sameSite?: 'lax' | 'strict' | 'none'
    httpOnly?: boolean
    secure?: boolean
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const seedEmail = process.env.PLAYWRIGHT_SEED_EMAIL
const seedPassword = process.env.PLAYWRIGHT_SEED_PASSWORD
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const storagePath =
  process.env.PLAYWRIGHT_STORAGE_PATH ?? 'playwright/.auth/user.json'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing env. Require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
  process.exit(1)
}

if (!seedEmail || !seedPassword) {
  console.error(
    'Missing env. Require PLAYWRIGHT_SEED_EMAIL and PLAYWRIGHT_SEED_PASSWORD.'
  )
  process.exit(1)
}

const cookieJar = new Map<string, CookieRecord>()

const cookies = {
  getAll: () =>
    Array.from(cookieJar.entries()).map(([name, record]) => ({
      name,
      value: record.value,
    })),
  setAll: (setCookies: Array<{ name: string; value: string; options?: CookieRecord['options'] }>) => {
    setCookies.forEach(({ name, value, options }) => {
      if (!value) {
        cookieJar.delete(name)
        return
      }
      cookieJar.set(name, { value, options })
    })
  },
}

function toPlaywrightSameSite(value?: string) {
  if (!value) return 'Lax'
  const lower = value.toLowerCase()
  if (lower === 'strict') return 'Strict'
  if (lower === 'none') return 'None'
  return 'Lax'
}

async function main() {
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies,
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: seedEmail,
    password: seedPassword,
  })

  if (error || !data.session) {
    throw new Error(error?.message || 'Failed to sign in seed user')
  }

  const hostname = new URL(baseUrl).hostname
  const now = Math.floor(Date.now() / 1000)

  const cookieState = Array.from(cookieJar.entries()).map(([name, record]) => {
    const options = record.options ?? {}
    const maxAge = typeof options.maxAge === 'number' ? options.maxAge : undefined
    const expires = maxAge ? now + maxAge : -1

    return {
      name,
      value: record.value,
      domain: hostname,
      path: options.path ?? '/',
      expires,
      httpOnly: Boolean(options.httpOnly),
      secure: Boolean(options.secure),
      sameSite: toPlaywrightSameSite(options.sameSite),
    }
  })

  mkdirSync(dirname(storagePath), { recursive: true })
  writeFileSync(
    storagePath,
    JSON.stringify({ cookies: cookieState, origins: [] }, null, 2)
  )

  console.log(`Wrote Playwright auth state to ${storagePath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
