import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

const { recordOpenNowUtcFallbackTelemetryMock } = vi.hoisted(() => ({
  recordOpenNowUtcFallbackTelemetryMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/server/filters/open-now-telemetry', () => ({
  recordOpenNowUtcFallbackTelemetry: recordOpenNowUtcFallbackTelemetryMock,
}))

import { POST } from '@/app/api/filters/query/route'

describe('POST /api/filters/query', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    recordOpenNowUtcFallbackTelemetryMock.mockReset()
    recordOpenNowUtcFallbackTelemetryMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('returns list metadata in list_items mode for list-scoped queries', async () => {
    const listId = '11111111-1111-4111-8111-111111111111'
    const listRecord = {
      id: listId,
      name: 'Weekend NYC',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-03-01',
      end_date: '2026-03-03',
      timezone: 'America/New_York',
    }

    const listsEqQuery = {
      single: vi.fn().mockResolvedValue({ data: listRecord, error: null }),
    } as {
      single: ReturnType<typeof vi.fn>
    }
    const listsSelectQuery = {
      eq: vi.fn().mockReturnValue(listsEqQuery),
    } as {
      eq: ReturnType<typeof vi.fn>
    }

    const listItemsQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      or: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    listItemsQuery.eq.mockReturnValue(listItemsQuery)
    listItemsQuery.in.mockReturnValue(listItemsQuery)
    listItemsQuery.or.mockReturnValue(listItemsQuery)
    listItemsQuery.order.mockReturnValue(listItemsQuery)
    listItemsQuery.range.mockResolvedValue({ data: [], error: null })

    const fromSpy = vi.fn((table: string) => {
      if (table === 'lists') {
        return { select: vi.fn().mockReturnValue(listsSelectQuery) }
      }
      if (table === 'list_items') {
        return { select: vi.fn().mockReturnValue(listItemsQuery) }
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
          list_id: listId,
          filters: {},
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      mode?: string
      list?: { id?: string; timezone?: string }
      canonicalFilters?: { within_list_id?: string | null }
      items?: unknown[]
    }

    expect(json.mode).toBe('list_items')
    expect(json.list?.id).toBe(listId)
    expect(json.list?.timezone).toBe('America/New_York')
    expect(json.canonicalFilters?.within_list_id).toBe(listId)
    expect(json.items).toEqual([])
    expect(fromSpy).toHaveBeenCalledWith('lists')
    expect(fromSpy).toHaveBeenCalledWith('list_items')
  })

  it('evaluates open_now deterministically using list timezone', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-10T02:00:00.000Z')) // Monday 21:00 in New York

    const listId = '11111111-1111-4111-8111-111111111111'
    const listRecord = {
      id: listId,
      name: 'Night Out',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: 'America/New_York',
    }

    const listsEqQuery = {
      single: vi.fn().mockResolvedValue({ data: listRecord, error: null }),
    } as {
      single: ReturnType<typeof vi.fn>
    }
    const listsSelectQuery = {
      eq: vi.fn().mockReturnValue(listsEqQuery),
    } as {
      eq: ReturnType<typeof vi.fn>
    }

    const listItemsQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      or: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    listItemsQuery.eq.mockReturnValue(listItemsQuery)
    listItemsQuery.in.mockReturnValue(listItemsQuery)
    listItemsQuery.or.mockReturnValue(listItemsQuery)
    listItemsQuery.order.mockReturnValue(listItemsQuery)
    listItemsQuery.range.mockResolvedValue({
      data: [
        {
          id: 'item-open',
          place: {
            opening_hours: {
              periods: [
                {
                  open: { day: 1, time: '2000' },
                  close: { day: 1, time: '2300' },
                },
              ],
            },
          },
        },
        {
          id: 'item-closed',
          place: {
            opening_hours: {
              periods: [
                {
                  open: { day: 1, time: '1000' },
                  close: { day: 1, time: '1200' },
                },
              ],
            },
          },
        },
      ],
      error: null,
    })

    const fromSpy = vi.fn((table: string) => {
      if (table === 'lists') {
        return { select: vi.fn().mockReturnValue(listsSelectQuery) }
      }
      if (table === 'list_items') {
        return { select: vi.fn().mockReturnValue(listItemsQuery) }
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
          list_id: listId,
          filters: { open_now: true },
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      mode?: string
      items?: Array<{ id?: string }>
    }

    expect(json.mode).toBe('list_items')
    expect(json.items?.map((item) => item.id)).toEqual(['item-open'])
    expect(listItemsQuery.range).toHaveBeenCalledWith(0, 4999)
    expect(fromSpy).toHaveBeenCalledWith('list_items')
    expect(recordOpenNowUtcFallbackTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'list_items',
        listId,
        expected: true,
        evaluatedCount: 2,
        utcFallbackCount: 0,
      })
    )
  })

  it('emits telemetry when open_now falls back to UTC', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-09T10:00:00.000Z')) // Monday 10:00 UTC

    const listId = '11111111-1111-4111-8111-111111111111'
    const listRecord = {
      id: listId,
      name: 'UTC Fallback',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: null,
    }

    const listsEqQuery = {
      single: vi.fn().mockResolvedValue({ data: listRecord, error: null }),
    } as {
      single: ReturnType<typeof vi.fn>
    }
    const listsSelectQuery = {
      eq: vi.fn().mockReturnValue(listsEqQuery),
    } as {
      eq: ReturnType<typeof vi.fn>
    }

    const listItemsQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      or: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    listItemsQuery.eq.mockReturnValue(listItemsQuery)
    listItemsQuery.in.mockReturnValue(listItemsQuery)
    listItemsQuery.or.mockReturnValue(listItemsQuery)
    listItemsQuery.order.mockReturnValue(listItemsQuery)
    listItemsQuery.range.mockResolvedValue({
      data: [
        {
          id: 'item-utc-fallback',
          place: {
            opening_hours: {
              periods: [
                {
                  open: { day: 1, time: '0900' },
                  close: { day: 1, time: '1100' },
                },
              ],
            },
          },
        },
      ],
      error: null,
    })

    const fromSpy = vi.fn((table: string) => {
      if (table === 'lists') {
        return { select: vi.fn().mockReturnValue(listsSelectQuery) }
      }
      if (table === 'list_items') {
        return { select: vi.fn().mockReturnValue(listItemsQuery) }
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
          list_id: listId,
          filters: { open_now: true },
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      items?: Array<{ id?: string }>
    }

    expect(json.items?.map((item) => item.id)).toEqual(['item-utc-fallback'])
    expect(recordOpenNowUtcFallbackTelemetryMock).toHaveBeenCalledTimes(1)
    expect(recordOpenNowUtcFallbackTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'list_items',
        listId,
        expected: true,
        evaluatedCount: 1,
        utcFallbackCount: 1,
      })
    )
  })

  it('prefers place timezone over list timezone when both are present', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-10T02:00:00.000Z')) // Monday 21:00 NY / 18:00 LA

    const listId = '11111111-1111-4111-8111-111111111111'
    const listRecord = {
      id: listId,
      name: 'Timezone Mismatch',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: 'America/Los_Angeles',
    }

    const listsEqQuery = {
      single: vi.fn().mockResolvedValue({ data: listRecord, error: null }),
    } as {
      single: ReturnType<typeof vi.fn>
    }
    const listsSelectQuery = {
      eq: vi.fn().mockReturnValue(listsEqQuery),
    } as {
      eq: ReturnType<typeof vi.fn>
    }

    const listItemsQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      or: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    listItemsQuery.eq.mockReturnValue(listItemsQuery)
    listItemsQuery.in.mockReturnValue(listItemsQuery)
    listItemsQuery.or.mockReturnValue(listItemsQuery)
    listItemsQuery.order.mockReturnValue(listItemsQuery)
    listItemsQuery.range.mockResolvedValue({
      data: [
        {
          id: 'item-ny-open',
          place: {
            opening_hours: {
              timezone: 'America/New_York',
              periods: [
                {
                  open: { day: 1, time: '2000' },
                  close: { day: 1, time: '2200' },
                },
              ],
            },
          },
        },
      ],
      error: null,
    })

    const fromSpy = vi.fn((table: string) => {
      if (table === 'lists') {
        return { select: vi.fn().mockReturnValue(listsSelectQuery) }
      }
      if (table === 'list_items') {
        return { select: vi.fn().mockReturnValue(listItemsQuery) }
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
          list_id: listId,
          filters: { open_now: true },
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      items?: Array<{ id?: string }>
    }

    expect(json.items?.map((item) => item.id)).toEqual(['item-ny-open'])
  })

  it('keeps overnight slots open across midnight in list timezone fallback', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-10T04:00:00.000Z')) // Monday 23:00 in New York

    const listId = '11111111-1111-4111-8111-111111111111'
    const listRecord = {
      id: listId,
      name: 'Overnight',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: 'America/New_York',
    }

    const listsEqQuery = {
      single: vi.fn().mockResolvedValue({ data: listRecord, error: null }),
    } as {
      single: ReturnType<typeof vi.fn>
    }
    const listsSelectQuery = {
      eq: vi.fn().mockReturnValue(listsEqQuery),
    } as {
      eq: ReturnType<typeof vi.fn>
    }

    const listItemsQuery = {
      eq: vi.fn(),
      in: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
    } as {
      eq: ReturnType<typeof vi.fn>
      in: ReturnType<typeof vi.fn>
      or: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      range: ReturnType<typeof vi.fn>
    }

    listItemsQuery.eq.mockReturnValue(listItemsQuery)
    listItemsQuery.in.mockReturnValue(listItemsQuery)
    listItemsQuery.or.mockReturnValue(listItemsQuery)
    listItemsQuery.order.mockReturnValue(listItemsQuery)
    listItemsQuery.range.mockResolvedValue({
      data: [
        {
          id: 'item-overnight-open',
          place: {
            opening_hours: {
              periods: [
                {
                  open: { day: 1, time: '2200' },
                  close: { day: 2, time: '0200' },
                },
              ],
            },
          },
        },
      ],
      error: null,
    })

    const fromSpy = vi.fn((table: string) => {
      if (table === 'lists') {
        return { select: vi.fn().mockReturnValue(listsSelectQuery) }
      }
      if (table === 'list_items') {
        return { select: vi.fn().mockReturnValue(listItemsQuery) }
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
          list_id: listId,
          filters: { open_now: true },
          limit: 10,
          offset: 0,
        }),
      })
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      items?: Array<{ id?: string }>
    }

    expect(json.items?.map((item) => item.id)).toEqual(['item-overnight-open'])
  })
})
