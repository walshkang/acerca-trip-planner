import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/filters/query/route'

describe('POST /api/filters/query', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when the user is not authenticated', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/filters/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
  })

  it('returns 400 and field errors for unknown filter keys', async () => {
    const fromSpy = vi.fn()
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: fromSpy,
    })

    const response = await POST(
      new Request('http://localhost/api/filters/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filters: {
            unknown_field: true,
          },
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
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('accepts top-level filters while ignoring pagination keys', async () => {
    const placesQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      contains: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      contains: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    placesQuery.eq.mockReturnValue(placesQuery)
    placesQuery.in.mockReturnValue(placesQuery)
    placesQuery.contains.mockReturnValue(placesQuery)
    placesQuery.order.mockReturnValue(placesQuery)
    placesQuery.range.mockResolvedValue({ data: [], error: null })

    const selectSpy = vi.fn().mockReturnValue(placesQuery)
    const fromSpy = vi.fn((table: string) => {
      if (table === 'places') {
        return { select: selectSpy }
      }
      throw new Error(`Unexpected table query: ${table}`)
    })

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: fromSpy,
    })

    const response = await POST(
      new Request('http://localhost/api/filters/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: ['food'],
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      mode?: string
      canonicalFilters?: { category?: string[] }
    }
    expect(json.mode).toBe('places')
    expect(json.canonicalFilters?.category).toEqual(['Food'])
    expect(fromSpy).toHaveBeenCalledWith('places')
  })
})
