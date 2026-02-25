import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  getRoutingPreviewProviderMock,
  providerPreviewMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getRoutingPreviewProviderMock: vi.fn(),
  providerPreviewMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/routing/provider', () => ({
  getRoutingPreviewProvider: getRoutingPreviewProviderMock,
}))

import { POST } from '@/app/api/lists/[id]/routing/preview/route'

type QueryResult<T> = {
  data: T
  error: { code?: string | null; message?: string | null } | null
}

type MockClientOptions = {
  userId?: string | null
  listResult?: QueryResult<any>
  joinedItemsResult?: QueryResult<any[]>
  fallbackItemsResult?: QueryResult<any[]>
  placesResult?: QueryResult<any[]>
}

function makeRequest(body: unknown, raw = false): Request {
  return new Request('http://localhost/api/lists/list-1/routing/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

function makeListQuery(result: QueryResult<any>) {
  const query = {
    eq: vi.fn(),
    single: vi.fn(),
  } as {
    eq: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  }
  query.eq.mockReturnValue(query)
  query.single.mockResolvedValue(result)
  return query
}

function makeItemQuery(result: QueryResult<any[]>) {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
  } as {
    eq: ReturnType<typeof vi.fn>
    is: ReturnType<typeof vi.fn>
  }
  query.eq.mockReturnValue(query)
  query.is.mockResolvedValue(result)
  return query
}

function makePlacesViewQuery(result: QueryResult<any[]>) {
  const query = {
    in: vi.fn(),
  } as {
    in: ReturnType<typeof vi.fn>
  }
  query.in.mockResolvedValue(result)
  return query
}

function mockClient(options: MockClientOptions = {}) {
  const userId = options.userId === undefined ? 'user-1' : options.userId
  const listResult: QueryResult<any> = options.listResult ?? {
    data: {
      id: 'list-1',
      name: 'Weekend',
      timezone: 'America/New_York',
      start_date: null,
      end_date: null,
    },
    error: null,
  }
  const joinedItemsResult: QueryResult<any[]> = options.joinedItemsResult ?? {
    data: [],
    error: null,
  }
  const fallbackItemsResult: QueryResult<any[]> = options.fallbackItemsResult ?? {
    data: [],
    error: null,
  }
  const placesResult: QueryResult<any[]> = options.placesResult ?? {
    data: [],
    error: null,
  }

  const listsQuery = makeListQuery(listResult)
  const joinedItemsQuery = makeItemQuery(joinedItemsResult)
  const fallbackItemsQuery = makeItemQuery(fallbackItemsResult)
  const placesViewQuery = makePlacesViewQuery(placesResult)

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return {
        select: vi.fn().mockReturnValue(listsQuery),
      }
    }

    if (table === 'list_items') {
      return {
        select: vi.fn((fields: string) => {
          if (fields.includes('place:places_view')) {
            return joinedItemsQuery
          }
          return fallbackItemsQuery
        }),
      }
    }

    if (table === 'places_view') {
      return {
        select: vi.fn().mockReturnValue(placesViewQuery),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  createClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId === null ? null : { id: userId } },
      }),
    },
    from,
  })

  return {
    from,
    joinedItemsQuery,
    fallbackItemsQuery,
    placesViewQuery,
  }
}

describe('POST /api/lists/[id]/routing/preview', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    getRoutingPreviewProviderMock.mockReset()
    providerPreviewMock.mockReset()

    providerPreviewMock.mockResolvedValue({
      ok: false,
      code: 'provider_unavailable',
      provider: 'unimplemented',
      message: 'Routing provider integration is not implemented yet.',
      retryable: false,
    })
    getRoutingPreviewProviderMock.mockReturnValue({
      provider: 'unimplemented',
      preview: providerPreviewMock,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockClient({ userId: null })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Unauthorized',
    })
  })

  it('returns 400 for invalid payload', async () => {
    mockClient()

    const response = await POST(makeRequest({ mode: 'scheduled' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    const json = (await response.json()) as {
      code?: string
      fieldErrors?: { date?: string[] }
    }
    expect(json.code).toBe('invalid_routing_payload')
    expect(json.fieldErrors?.date).toEqual([
      'date is required and must be YYYY-MM-DD',
    ])
  })

  it('returns 404 when list is missing', async () => {
    mockClient({
      listResult: {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      code: 'not_found',
      message: 'List not found',
      lastValidCanonicalRequest: { date: '2026-03-01', mode: 'scheduled' },
    })
  })

  it('enforces lower bound when only start_date exists', async () => {
    mockClient({
      listResult: {
        data: {
          id: 'list-1',
          name: 'Weekend',
          timezone: 'America/New_York',
          start_date: '2026-03-10',
          end_date: null,
        },
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-09' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'date_outside_trip_range',
      message: 'date must be within list trip bounds',
      lastValidCanonicalRequest: { date: '2026-03-09', mode: 'scheduled' },
    })
  })

  it('enforces upper bound when only end_date exists', async () => {
    mockClient({
      listResult: {
        data: {
          id: 'list-1',
          name: 'Weekend',
          timezone: 'America/New_York',
          start_date: null,
          end_date: '2026-03-10',
        },
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-11' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'date_outside_trip_range',
      message: 'date must be within list trip bounds',
      lastValidCanonicalRequest: { date: '2026-03-11', mode: 'scheduled' },
    })
  })

  it('treats start/end bounds as inclusive when both are set', async () => {
    mockClient({
      listResult: {
        data: {
          id: 'list-1',
          name: 'Weekend',
          timezone: 'America/New_York',
          start_date: '2026-03-10',
          end_date: '2026-03-12',
        },
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-12' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(200)
    const json = (await response.json()) as { status?: string }
    expect(json.status).toBe('insufficient_items')
  })

  it('allows any date when list has no trip bounds', async () => {
    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-1',
              name: 'A',
              category: 'Coffee',
              lat: 40.7,
              lng: -73.9,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(200)
    const json = (await response.json()) as { status?: string; summary?: any }
    expect(json.status).toBe('insufficient_items')
    expect(json.summary?.routeable_items).toBe(1)
    expect(getRoutingPreviewProviderMock).not.toHaveBeenCalled()
    expect(providerPreviewMock).not.toHaveBeenCalled()
  })

  it('sorts deterministically across slot/category/order/ties and puts unslotted last', async () => {
    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-unslotted',
            place_id: 'place-unslotted',
            created_at: '2026-03-01T10:06:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: null,
            scheduled_order: 1,
            place: {
              id: 'place-unslotted',
              name: 'Unslotted',
              category: 'Food',
              lat: 40.71,
              lng: -73.98,
            },
          },
          {
            id: 'item-food-null-order',
            place_id: 'place-food-null-order',
            created_at: '2026-03-01T10:02:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: null,
            place: {
              id: 'place-food-null-order',
              name: 'Food Null',
              category: 'Food',
              lat: 40.72,
              lng: -73.97,
            },
          },
          {
            id: 'item-food-order-1',
            place_id: 'place-food-order-1',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-food-order-1',
              name: 'Food One',
              category: 'Food',
              lat: 40.73,
              lng: -73.96,
            },
          },
          {
            id: 'item-coffee-a',
            place_id: 'place-coffee-a',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 0,
            place: {
              id: 'place-coffee-a',
              name: 'Coffee A',
              category: 'Coffee',
              lat: 40.74,
              lng: -73.95,
            },
          },
          {
            id: 'item-coffee-b',
            place_id: 'place-coffee-b',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 0,
            place: {
              id: 'place-coffee-b',
              name: 'Coffee B',
              category: 'Coffee',
              lat: 40.75,
              lng: -73.94,
            },
          },
          {
            id: 'item-evening',
            place_id: 'place-evening',
            created_at: '2026-03-01T10:05:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '19:00:00',
            scheduled_order: 0,
            place: {
              id: 'place-evening',
              name: 'Evening',
              category: 'Drinks',
              lat: 40.76,
              lng: -73.93,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(501)
    const json = (await response.json()) as { sequence?: Array<{ item_id: string }> }
    expect(json.sequence?.map((row) => row.item_id)).toEqual([
      'item-food-null-order',
      'item-food-order-1',
      'item-coffee-a',
      'item-coffee-b',
      'item-evening',
      'item-unslotted',
    ])
  })

  it('marks missing coordinates as unroutable', async () => {
    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-1',
              name: 'NoCoord',
              category: 'Coffee',
              lat: null,
              lng: null,
            },
          },
          {
            id: 'item-2',
            place_id: 'place-2',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '14:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-2',
              name: 'Coord',
              category: 'Food',
              lat: 40.7,
              lng: -73.9,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      unroutableItems?: Array<{ item_id: string; reason: string }>
      summary?: { unroutable_items?: number; routeable_items?: number }
    }
    expect(json.unroutableItems).toEqual([
      {
        item_id: 'item-1',
        place_id: 'place-1',
        place_name: 'NoCoord',
        reason: 'missing_coordinates',
      },
    ])
    expect(json.summary?.unroutable_items).toBe(1)
    expect(json.summary?.routeable_items).toBe(1)
  })

  it('returns 501 with leg drafts for two or more routeable items', async () => {
    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-1',
              name: 'A',
              category: 'Food',
              lat: 40.7,
              lng: -73.9,
            },
          },
          {
            id: 'item-2',
            place_id: 'place-2',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '14:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-2',
              name: 'B',
              category: 'Coffee',
              lat: 40.71,
              lng: -73.91,
            },
          },
          {
            id: 'item-3',
            place_id: 'place-3',
            created_at: '2026-03-01T10:02:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '19:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-3',
              name: 'C',
              category: 'Drinks',
              lat: 40.72,
              lng: -73.92,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(501)
    const json = (await response.json()) as {
      code?: string
      status?: string
      legs?: Array<{ from_item_id: string; to_item_id: string }>
      summary?: { leg_count?: number; routeable_items?: number }
    }
    expect(json.code).toBe('routing_provider_unavailable')
    expect(json.status).toBe('provider_unavailable')
    expect(json.legs).toEqual([
      {
        index: 0,
        from_item_id: 'item-1',
        to_item_id: 'item-2',
        from_place_id: 'place-1',
        to_place_id: 'place-2',
      },
      {
        index: 1,
        from_item_id: 'item-2',
        to_item_id: 'item-3',
        from_place_id: 'place-2',
        to_place_id: 'place-3',
      },
    ])
    expect(json.summary?.leg_count).toBe(2)
    expect(json.summary?.routeable_items).toBe(3)
    expect(getRoutingPreviewProviderMock).toHaveBeenCalledTimes(1)
    expect(providerPreviewMock).toHaveBeenCalledTimes(1)
    expect(providerPreviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalRequest: { date: '2026-03-01', mode: 'scheduled' },
        list: expect.objectContaining({
          id: 'list-1',
          name: 'Weekend',
        }),
      })
    )
  })

  it('maps provider_error failures to 500 internal_error', async () => {
    providerPreviewMock.mockResolvedValueOnce({
      ok: false,
      code: 'provider_error',
      provider: 'google_routes',
      message: 'Routing provider request failed.',
      retryable: true,
    })

    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-1',
              name: 'A',
              category: 'Food',
              lat: 40.7,
              lng: -73.9,
            },
          },
          {
            id: 'item-2',
            place_id: 'place-2',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '14:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-2',
              name: 'B',
              category: 'Coffee',
              lat: 40.71,
              lng: -73.91,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      code: 'internal_error',
      message: 'Routing provider request failed.',
      lastValidCanonicalRequest: { date: '2026-03-01', mode: 'scheduled' },
    })
  })

  it('maps provider exceptions to 500 internal_error', async () => {
    providerPreviewMock.mockRejectedValueOnce(new Error('Provider exploded'))

    mockClient({
      joinedItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-1',
              name: 'A',
              category: 'Food',
              lat: 40.7,
              lng: -73.9,
            },
          },
          {
            id: 'item-2',
            place_id: 'place-2',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '14:00:00',
            scheduled_order: 1,
            place: {
              id: 'place-2',
              name: 'B',
              category: 'Coffee',
              lat: 40.71,
              lng: -73.91,
            },
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      code: 'internal_error',
      message: 'Provider exploded',
    })
  })

  it('falls back to two-step hydration when joined relation fails', async () => {
    const mocked = mockClient({
      joinedItemsResult: {
        data: [],
        error: {
          code: 'PGRST200',
          message:
            'Could not find a relationship between list_items and places_view in the schema cache',
        },
      },
      fallbackItemsResult: {
        data: [
          {
            id: 'item-1',
            place_id: 'place-1',
            created_at: '2026-03-01T10:00:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '09:00:00',
            scheduled_order: 1,
          },
          {
            id: 'item-2',
            place_id: 'place-2',
            created_at: '2026-03-01T10:01:00.000Z',
            scheduled_date: '2026-03-01',
            scheduled_start_time: '14:00:00',
            scheduled_order: 1,
          },
        ],
        error: null,
      },
      placesResult: {
        data: [
          {
            id: 'place-1',
            name: 'A',
            category: 'Food',
            lat: 40.7,
            lng: -73.9,
          },
          {
            id: 'place-2',
            name: 'B',
            category: 'Coffee',
            lat: 40.71,
            lng: -73.91,
          },
        ],
        error: null,
      },
    })

    const response = await POST(makeRequest({ date: '2026-03-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(501)
    expect(mocked.placesViewQuery.in).toHaveBeenCalledWith('id', [
      'place-1',
      'place-2',
    ])
  })
})
