import { createBrowserClient } from '@supabase/ssr'
import fs from 'fs'
import path from 'path'

type CookieRecord = {
  value: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
}

function loadDotEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return

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

function toPlaywrightSameSite(value?: unknown) {
  if (typeof value !== 'string') return 'Lax'
  const lower = value.toLowerCase()
  if (lower === 'strict') return 'Strict'
  if (lower === 'none') return 'None'
  return 'Lax'
}

export default async function globalSetup() {
  loadDotEnvLocal()

  if (process.env.PLAYWRIGHT_SKIP_AUTH_SETUP === '1') {
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const seedEmail = process.env.PLAYWRIGHT_SEED_EMAIL
  const seedPassword = process.env.PLAYWRIGHT_SEED_PASSWORD

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  const storagePath =
    process.env.PLAYWRIGHT_STORAGE_STATE ?? 'playwright/.auth/user.json'

  const missingEnv: string[] = []
  if (!supabaseUrl) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingEnv.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!seedEmail) missingEnv.push('PLAYWRIGHT_SEED_EMAIL')
  if (!seedPassword) missingEnv.push('PLAYWRIGHT_SEED_PASSWORD')

  if (missingEnv.length) {
    throw new Error(
      `Playwright auth setup missing env: ${missingEnv.join(', ')}`
    )
  }

  const cookieJar = new Map<string, CookieRecord>()

  const cookies = {
    getAll: () =>
      Array.from(cookieJar.entries()).map(([name, record]) => ({
        name,
        value: record.value,
      })),
    setAll: (
      setCookies: Array<{ name: string; value: string; options?: unknown }>
    ) => {
      setCookies.forEach(({ name, value, options }) => {
        if (!value) {
          cookieJar.delete(name)
          return
        }
        cookieJar.set(name, { value, options })
      })
    },
  }

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
    const options =
      record.options && typeof record.options === 'object' ? record.options : {}

    const maxAge = typeof options.maxAge === 'number' ? options.maxAge : null
    const expires = maxAge ? now + maxAge : -1

    return {
      name,
      value: record.value,
      domain: hostname,
      path: typeof options.path === 'string' ? options.path : '/',
      expires,
      httpOnly: Boolean(options.httpOnly),
      secure: Boolean(options.secure),
      sameSite: toPlaywrightSameSite(options.sameSite),
    }
  })

  fs.mkdirSync(path.dirname(storagePath), { recursive: true })
  fs.writeFileSync(
    storagePath,
    JSON.stringify({ cookies: cookieState, origins: [] }, null, 2)
  )
}

