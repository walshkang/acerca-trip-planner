import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GooglePlacesResult } from '@/lib/enrichment/sources'

const { createClientMock, fetchGooglePlaceMock, searchGooglePlacesMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fetchGooglePlaceMock: vi.fn(),
  searchGooglePlacesMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/enrichment/sources', () => ({
  fetchGooglePlace: fetchGooglePlaceMock,
  searchGooglePlaces: searchGooglePlacesMock,
  SourceFetchError: class SourceFetchError extends Error {},
}))

import { POST } from '@/app/api/lists/[id]/import/preview/route'

function minimalGooglePlace(placeId: string): GooglePlacesResult {
  return {
    place_id: placeId,
    name: 'Test Place',
    geometry: { location: { lat: 13.7563, lng: 100.5018 } },
    types: ['restaurant'],
  }
}

function makeSupabaseClient(options?: { authenticated?: boolean; listExists?: boolean }) {
  const authenticated = options?.authenticated ?? true
  const listExists = options?.listExists ?? true

  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: authenticated ? { id: 'user-1' } : null },
    }),
  }

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(
          listExists
            ? { data: { id: 'list-1' }, error: null }
            : { data: null, error: { code: 'PGRST116', message: 'Not found' } }
        ),
      }
    }
    throw new Error(`Unexpected table in preview-api test: ${table}`)
  })

  return { auth, from }
}

describe('POST /api/lists/[id]/import/preview', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    fetchGooglePlaceMock.mockReset()
    searchGooglePlacesMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with preview_id, rows, trip_summary and computed on resolved row', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    const placeId = 'ChIJdirectOk0000000000'
    fetchGooglePlaceMock.mockResolvedValue(minimalGooglePlace(placeId))
    searchGooglePlacesMock.mockResolvedValue([])

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rows: [{ place_name: placeId }],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      preview_id: string
      rows: Array<{ status: string; computed: Record<string, unknown> | null }>
      trip_summary: { total_days: number }
    }
    expect(json.preview_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(json.rows).toHaveLength(1)
    expect(json.rows[0].status).toBe('ok')
    expect(json.rows[0].computed).not.toBeNull()
    expect(json.rows[0].computed).toMatchObject({
      slot_conflict: false,
      distance_from_previous_km: null,
    })
    expect(searchGooglePlacesMock).not.toHaveBeenCalled()
  })

  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ authenticated: false }))

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [{ place_name: 'ChIJxxxxxxxxxxxxxxxx' }] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(401)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('unauthorized')
  })

  it('returns 404 when list is not found', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ listExists: false }))
    fetchGooglePlaceMock.mockResolvedValue(minimalGooglePlace('ChIJxxxxxxxxxxxxxxxx'))

    const response = await POST(
      new Request('http://localhost/api/lists/missing/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [{ place_name: 'ChIJxxxxxxxxxxxxxxxx' }] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'missing' } }
    )

    expect(response.status).toBe(404)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('list_not_found')
  })

  it('returns 400 for invalid JSON body', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json{',
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('invalid_import_payload')
  })

  it('returns 400 for empty rows', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('invalid_import_payload')
  })

  it('resolves Google Maps URL via place_id param and calls fetchGooglePlace once', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    const extractedId = 'ChIJurlExtractedFromQueryParam'
    fetchGooglePlaceMock.mockResolvedValue(minimalGooglePlace(extractedId))

    const url = `https://www.google.com/maps/search/?api=1&query_place_id=${extractedId}`
    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [{ place_name: url }] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    expect(fetchGooglePlaceMock).toHaveBeenCalledTimes(1)
    expect(fetchGooglePlaceMock).toHaveBeenCalledWith(extractedId)
    expect(searchGooglePlacesMock).not.toHaveBeenCalled()
  })

  it('returns ambiguous when search returns multiple candidates', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    searchGooglePlacesMock.mockResolvedValue([
      {
        place_id: 'ChIJambA',
        name: 'A',
        geometry: { location: { lat: 1, lng: 2 } },
      },
      {
        place_id: 'ChIJambB',
        name: 'B',
        geometry: { location: { lat: 3, lng: 4 } },
      },
    ])

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [{ place_name: 'ambiguous query text' }] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      rows: Array<{ status: string; candidates: unknown[] | null }>
    }
    expect(json.rows[0].status).toBe('ambiguous')
    expect(json.rows[0].candidates?.length).toBeGreaterThanOrEqual(2)
    expect(fetchGooglePlaceMock).not.toHaveBeenCalled()
  })

  it('returns error status when search returns no matches', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())
    searchGooglePlacesMock.mockResolvedValue([])

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: [{ place_name: 'zzzznonexistentquery12345' }] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      rows: Array<{ status: string; error_message: string | null }>
    }
    expect(json.rows[0].status).toBe('error')
    expect(json.rows[0].error_message).toBeTruthy()
  })
})
