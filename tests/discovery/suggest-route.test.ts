import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SourceFetchError } from '@/lib/enrichment/sources'

const { createClientMock, searchGooglePlacesMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  searchGooglePlacesMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/enrichment/sources', async () => {
  const actual = await vi.importActual<typeof import('@/lib/enrichment/sources')>(
    '@/lib/enrichment/sources'
  )
  return {
    ...actual,
    searchGooglePlaces: searchGooglePlacesMock,
  }
})

import { POST } from '@/app/api/discovery/suggest/route'

type PlaceRow = {
  id: string
  name: string
  address: string | null
  category: 'Food' | 'Coffee' | 'Sights' | 'Shop' | 'Activity' | 'Drinks'
  energy: 'Low' | 'Medium' | 'High' | null
  opening_hours: unknown | null
  google_place_id: string | null
  name_normalized: string | null
  address_normalized: string | null
}

type MockClientOptions = {
  authenticated?: boolean
  listExists?: boolean
  placesRows?: PlaceRow[]
  matchedPlacesRows?: PlaceRow[]
  coordinatesById?: Record<string, { lat: number | null; lng: number | null }>
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/discovery/suggest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeSupabaseClient(options: MockClientOptions = {}) {
  const authenticated = options.authenticated ?? true
  const listExists = options.listExists ?? true
  const placesRows = options.placesRows ?? []
  const matchedPlacesRows = options.matchedPlacesRows ?? []
  const coordinatesById = options.coordinatesById ?? {}

  const insertSpy = vi.fn()
  const updateSpy = vi.fn()
  const upsertSpy = vi.fn()
  const rpcSpy = vi.fn()
  let placesEqCount = 0

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      const single = vi.fn().mockResolvedValue(
        listExists
          ? { data: { id: 'list-1', timezone: 'America/New_York' }, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
      )
      const eq = vi.fn().mockReturnValue({ single })
      const select = vi.fn().mockReturnValue({ eq, insert: insertSpy, update: updateSpy })
      return { select, insert: insertSpy, update: updateSpy, upsert: upsertSpy }
    }

    if (table === 'places') {
      const eq = vi.fn().mockImplementation(() => {
        placesEqCount += 1
        if (placesEqCount === 1) {
          return Promise.resolve({ data: placesRows, error: null })
        }
        const inFn = vi.fn().mockResolvedValue({ data: matchedPlacesRows, error: null })
        return { in: inFn }
      })
      const select = vi.fn().mockReturnValue({ eq, insert: insertSpy, update: updateSpy })
      return { select, insert: insertSpy, update: updateSpy, upsert: upsertSpy }
    }

    if (table === 'places_view') {
      const inFn = vi.fn().mockImplementation((_field: string, ids: string[]) => {
        const rows = ids.map((id) => ({
          id,
          lat: coordinatesById[id]?.lat ?? null,
          lng: coordinatesById[id]?.lng ?? null,
        }))
        return Promise.resolve({ data: rows, error: null })
      })
      const select = vi.fn().mockReturnValue({ in: inFn })
      return { select, insert: insertSpy, update: updateSpy, upsert: upsertSpy }
    }

    throw new Error(`Unexpected table query: ${table}`)
  })

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: 'user-1' } : null },
      }),
    },
    from,
    rpc: rpcSpy,
  }

  return {
    client,
    insertSpy,
    updateSpy,
    upsertSpy,
    rpcSpy,
  }
}

describe('POST /api/discovery/suggest', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    searchGooglePlacesMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const mock = makeSupabaseClient({ authenticated: false })
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(makeRequest({ intent: 'union square' }))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Unauthorized',
    })
  })

  it('returns 400 invalid payload errors', async () => {
    const mock = makeSupabaseClient()
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(makeRequest({ include_summary: 'yes' }))
    expect(response.status).toBe(400)
    const json = (await response.json()) as {
      code?: string
      fieldErrors?: { intent?: string[]; include_summary?: string[] }
    }
    expect(json.code).toBe('invalid_discovery_payload')
    expect(json.fieldErrors?.intent).toEqual([
      'intent is required and must be a string',
    ])
    expect(json.fieldErrors?.include_summary).toEqual([
      'include_summary must be a boolean',
    ])
  })

  it('returns 404 for missing list scope', async () => {
    const mock = makeSupabaseClient({ listExists: false })
    createClientMock.mockResolvedValue(mock.client)
    searchGooglePlacesMock.mockResolvedValue([])

    const response = await POST(
      makeRequest({
        intent: 'date night',
        list_id: '550e8400-e29b-41d4-a716-446655440000',
      })
    )

    expect(response.status).toBe(404)
    const json = (await response.json()) as { code?: string; message?: string }
    expect(json.code).toBe('not_found')
    expect(json.message).toBe('List not found')
  })

  it('is deterministic and enforces places-first merge ordering', async () => {
    const placesRows: PlaceRow[] = [
      {
        id: 'place-1',
        name: 'Alpha Spot',
        address: '1 Main',
        category: 'Food',
        energy: 'Low',
        opening_hours: null,
        google_place_id: 'google-1',
        name_normalized: 'alpha-spot',
        address_normalized: '1-main',
      },
      {
        id: 'place-2',
        name: 'Beta Spot',
        address: '2 Main',
        category: 'Food',
        energy: null,
        opening_hours: null,
        google_place_id: null,
        name_normalized: 'beta-spot',
        address_normalized: '2-main',
      },
    ]
    const coordinatesById = {
      'place-1': { lat: 40.75, lng: -73.99 },
      'place-2': { lat: 40.76, lng: -73.98 },
    }

    createClientMock.mockImplementation(async () => {
      const mock = makeSupabaseClient({
        placesRows,
        matchedPlacesRows: [placesRows[0]],
        coordinatesById,
      })
      return mock.client
    })
    searchGooglePlacesMock.mockResolvedValue([
      {
        place_id: 'google-1',
        name: 'Alpha Spot',
        formatted_address: '1 Main',
        geometry: { location: { lat: 40.75, lng: -73.99 } },
      },
      {
        place_id: 'google-3',
        name: 'Gamma Spot',
        formatted_address: '3 Main',
        geometry: { location: { lat: 40.77, lng: -73.97 } },
      },
    ])

    const payload = { intent: 'union square', include_summary: false }
    const first = await POST(makeRequest(payload))
    const second = await POST(makeRequest(payload))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = (await first.json()) as {
      suggestions?: Array<{ source?: string; source_id?: string; score?: number }>
    }
    const secondJson = (await second.json()) as {
      suggestions?: Array<{ source?: string; source_id?: string; score?: number }>
    }

    expect(firstJson.suggestions).toEqual(secondJson.suggestions)
    expect(firstJson.suggestions?.[0]?.source).toBe('places_index')
    expect(firstJson.suggestions?.[1]?.source).toBe('places_index')
    expect(firstJson.suggestions?.[2]?.source).toBe('google_search')
    expect(firstJson.suggestions?.map((item) => item.source_id)).toEqual([
      'place-1',
      'place-2',
      'google-3',
    ])
    expect((firstJson.suggestions?.[0]?.score ?? 0) > (firstJson.suggestions?.[2]?.score ?? 0)).toBe(
      true
    )
  })

  it('keeps suggestions stable when include_summary toggles', async () => {
    const placesRows: PlaceRow[] = [
      {
        id: 'place-10',
        name: 'Delta Spot',
        address: '10 Main',
        category: 'Food',
        energy: null,
        opening_hours: null,
        google_place_id: null,
        name_normalized: 'delta-spot',
        address_normalized: '10-main',
      },
    ]
    createClientMock.mockImplementation(async () => {
      const mock = makeSupabaseClient({
        placesRows,
        matchedPlacesRows: [],
        coordinatesById: { 'place-10': { lat: 40.7, lng: -73.9 } },
      })
      return mock.client
    })
    searchGooglePlacesMock.mockResolvedValue([
      {
        place_id: 'google-x',
        name: 'External Spot',
        formatted_address: '99 Main',
        geometry: { location: { lat: 40.71, lng: -73.91 } },
      },
    ])

    const withoutSummary = await POST(
      makeRequest({ intent: 'union square', include_summary: false })
    )
    const withSummary = await POST(
      makeRequest({ intent: 'union square', include_summary: true })
    )

    expect(withoutSummary.status).toBe(200)
    expect(withSummary.status).toBe(200)

    const a = (await withoutSummary.json()) as { suggestions?: unknown[]; summary?: unknown }
    const b = (await withSummary.json()) as { suggestions?: unknown[]; summary?: unknown }
    expect(a.suggestions).toEqual(b.suggestions)
    expect(
      (a.suggestions as Array<{ score: number; rank: number }> | undefined)?.map(
        ({ score, rank }) => ({ score, rank })
      )
    ).toEqual(
      (b.suggestions as Array<{ score: number; rank: number }> | undefined)?.map(
        ({ score, rank }) => ({ score, rank })
      )
    )
    expect(a.summary).toBeNull()
    expect(b.summary).not.toBeNull()
  })

  it('maps provider missing_env to 503 and provider failures to 502', async () => {
    createClientMock.mockImplementation(async () => {
      const mock = makeSupabaseClient({
        placesRows: [],
        matchedPlacesRows: [],
        coordinatesById: {},
      })
      return mock.client
    })

    searchGooglePlacesMock.mockRejectedValueOnce(
      new SourceFetchError('missing_env', 'GOOGLE_PLACES_API_KEY is not set')
    )
    const unavailable = await POST(makeRequest({ intent: 'union square' }))
    expect(unavailable.status).toBe(503)
    await expect(unavailable.json()).resolves.toMatchObject({
      code: 'discovery_provider_unavailable',
    })

    searchGooglePlacesMock.mockRejectedValueOnce(
      new SourceFetchError('http_error', 'HTTP 500 for provider', { status: 500 })
    )
    const badGateway = await POST(makeRequest({ intent: 'union square' }))
    expect(badGateway.status).toBe(502)
    await expect(badGateway.json()).resolves.toMatchObject({
      code: 'discovery_provider_bad_gateway',
    })
  })

  it('does not invoke write methods', async () => {
    const mock = makeSupabaseClient({
      placesRows: [],
      matchedPlacesRows: [],
      coordinatesById: {},
    })
    createClientMock.mockResolvedValue(mock.client)
    searchGooglePlacesMock.mockResolvedValue([])

    const response = await POST(makeRequest({ intent: 'union square' }))
    expect(response.status).toBe(200)

    expect(mock.insertSpy).not.toHaveBeenCalled()
    expect(mock.updateSpy).not.toHaveBeenCalled()
    expect(mock.upsertSpy).not.toHaveBeenCalled()
    expect(mock.rpcSpy).not.toHaveBeenCalled()
  })
})
