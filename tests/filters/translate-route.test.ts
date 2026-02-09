import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/filters/translate/route'

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY

function makeSupabaseClient(options?: {
  authenticated?: boolean
  listExists?: boolean
}) {
  const authenticated = options?.authenticated ?? true
  const listExists = options?.listExists ?? true

  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: authenticated ? { id: 'user-1' } : null },
    }),
  }

  const single = vi.fn().mockResolvedValue(
    listExists
      ? { data: { id: '550e8400-e29b-41d4-a716-446655440000' }, error: null }
      : { data: null, error: { code: 'PGRST116', message: 'Not found' } }
  )
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn((table: string) => {
    if (table !== 'lists') {
      throw new Error(`Unexpected table query in test: ${table}`)
    }
    return { select }
  })

  return { auth, from }
}

describe('POST /api/filters/translate', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY
    vi.unstubAllGlobals()
  })

  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ authenticated: false }))

    const response = await POST(
      new Request('http://localhost/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'coffee open now' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('returns 400 when intent is missing', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())

    const response = await POST(
      new Request('http://localhost/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as { error?: string }
    expect(json.error).toBe('intent is required and must be a non-empty string')
  })

  it('uses deterministic fallback when OPENAI_API_KEY is missing', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    delete process.env.OPENAI_API_KEY

    const response = await POST(
      new Request('http://localhost/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'Find coffee spots open now',
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      canonicalFilters?: { category?: string[]; open_now?: boolean | null }
      usedFallback?: boolean
      model?: string
    }
    expect(json.canonicalFilters?.category).toEqual(['Coffee'])
    expect(json.canonicalFilters?.open_now).toBe(true)
    expect(json.usedFallback).toBe(true)
    expect(json.model).toBe('deterministic-fallback')
  })

  it('rejects invalid schema returned by translation output', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    process.env.OPENAI_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ unknown_field: true }),
              },
            },
          ],
        }),
      })
    )

    const response = await POST(
      new Request('http://localhost/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'any intent',
        }),
      })
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as {
      code?: string
      fieldErrors?: { payload?: string[] }
    }
    expect(json.code).toBe('invalid_filter_payload')
    expect(json.fieldErrors?.payload).toEqual([
      'Unknown filter field: unknown_field',
    ])
  })

  it('injects list_id into translated tags output', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ listExists: true }))
    process.env.OPENAI_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ tags: ['Date Night'] }),
              },
            },
          ],
        }),
      })
    )

    const listId = '550e8400-e29b-41d4-a716-446655440000'
    const response = await POST(
      new Request('http://localhost/api/filters/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'date night spots',
          list_id: listId,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      canonicalFilters?: { tags?: string[]; within_list_id?: string | null }
    }
    expect(json.canonicalFilters?.tags).toEqual(['date-night'])
    expect(json.canonicalFilters?.within_list_id).toBe(listId)
  })
})
