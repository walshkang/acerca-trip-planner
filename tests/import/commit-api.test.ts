import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/server/places/ingest-google-place', () => ({
  IngestGooglePlaceError: class IngestGooglePlaceError extends Error {},
  ingestGooglePlaceAsCandidate: vi.fn(),
}))

import {
  IngestGooglePlaceError,
  ingestGooglePlaceAsCandidate,
} from '@/lib/server/places/ingest-google-place'
import { POST } from '@/app/api/lists/[id]/import/commit/route'

function makeSupabaseClient(options?: {
  authenticated?: boolean
  listRow?: {
    id: string
    start_date: string | null
    end_date: string | null
  } | null
}) {
  const authenticated = options?.authenticated ?? true
  const listRow =
    options?.listRow === undefined
      ? { id: 'list-1', start_date: null, end_date: null }
      : options.listRow

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
          listRow
            ? { data: listRow, error: null }
            : { data: null, error: { code: 'PGRST116', message: 'Not found' } }
        ),
      }
    }
    throw new Error(`Unexpected table in commit-api test: ${table}`)
  })

  return { auth, from }
}

/** Supabase mock for a single-row commit that creates a place via promote_place_candidate. */
function makeSupabaseClientPromoteSuccess(options?: {
  promotedPlaceId?: string
  listItemId?: string
  listRow?: { id: string; start_date: string | null; end_date: string | null }
}) {
  const promotedPlaceId = options?.promotedPlaceId ?? 'place-promoted-1'
  const listItemId = options?.listItemId ?? 'list-item-1'
  const listRow = options?.listRow ?? { id: 'list-1', start_date: null, end_date: null }

  const placesMaybeSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: null, error: null })

  const placesSingle = vi.fn().mockResolvedValue({
    data: { id: promotedPlaceId, enrichment_id: null },
    error: null,
  })

  const listItemsMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: listItemId, tags: [] as string[] | null },
    error: null,
  })

  const placesBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: placesMaybeSingle,
    single: placesSingle,
  }
  placesBuilder.select.mockReturnValue(placesBuilder)
  placesBuilder.eq.mockReturnValue(placesBuilder)

  const listItemsBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: listItemsMaybeSingle,
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
  listItemsBuilder.select.mockReturnValue(listItemsBuilder)
  listItemsBuilder.eq.mockReturnValue(listItemsBuilder)

  const rpc = vi.fn().mockResolvedValue({ data: promotedPlaceId, error: null })

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: listRow, error: null }),
      }
    }
    if (table === 'places') {
      return placesBuilder
    }
    if (table === 'list_items') {
      return listItemsBuilder
    }
    throw new Error(`Unexpected table in commit-api test: ${table}`)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from,
    rpc,
  }
}

/** Place already exists and is already on the list → status updated, no ingest. */
function makeSupabaseClientDuplicateOnList(options?: {
  existingPlaceId?: string
  existingListItemId?: string
}) {
  const existingPlaceId = options?.existingPlaceId ?? 'place-existing'
  const existingListItemId = options?.existingListItemId ?? 'li-existing'

  const placesMaybeSingle = vi.fn().mockResolvedValueOnce({
    data: { id: existingPlaceId },
    error: null,
  })

  const placesSingle = vi.fn().mockResolvedValue({
    data: { id: existingPlaceId, enrichment_id: null },
    error: null,
  })

  const listItemsMaybeSingle = vi
    .fn()
    .mockResolvedValueOnce({
      data: { id: existingListItemId },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { id: existingListItemId, tags: [] as string[] | null },
      error: null,
    })

  const placesBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: placesMaybeSingle,
    single: placesSingle,
  }
  placesBuilder.select.mockReturnValue(placesBuilder)
  placesBuilder.eq.mockReturnValue(placesBuilder)

  const listItemsBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: listItemsMaybeSingle,
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
  listItemsBuilder.select.mockReturnValue(listItemsBuilder)
  listItemsBuilder.eq.mockReturnValue(listItemsBuilder)

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'list-1', start_date: null, end_date: null },
          error: null,
        }),
      }
    }
    if (table === 'places') {
      return placesBuilder
    }
    if (table === 'list_items') {
      return listItemsBuilder
    }
    throw new Error(`Unexpected table in commit-api test: ${table}`)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from,
    rpc: vi.fn(),
  }
}

/** Two rows: first promote success, second ingest failure. */
function makeSupabaseClientPartialSuccess(options?: {
  promotedPlaceId?: string
  listItemId?: string
}) {
  const promotedPlaceId = options?.promotedPlaceId ?? 'place-row0'
  const listItemId = options?.listItemId ?? 'li-row0'

  const placesMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

  const placesSingle = vi.fn().mockResolvedValue({
    data: { id: promotedPlaceId, enrichment_id: null },
    error: null,
  })

  const listItemsMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: listItemId, tags: [] as string[] | null },
    error: null,
  })

  const placesBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: placesMaybeSingle,
    single: placesSingle,
  }
  placesBuilder.select.mockReturnValue(placesBuilder)
  placesBuilder.eq.mockReturnValue(placesBuilder)

  const listItemsBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: listItemsMaybeSingle,
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
  listItemsBuilder.select.mockReturnValue(listItemsBuilder)
  listItemsBuilder.eq.mockReturnValue(listItemsBuilder)

  const rpc = vi.fn().mockResolvedValueOnce({ data: promotedPlaceId, error: null })

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'list-1', start_date: null, end_date: null },
          error: null,
        }),
      }
    }
    if (table === 'places') {
      return placesBuilder
    }
    if (table === 'list_items') {
      return listItemsBuilder
    }
    throw new Error(`Unexpected table in commit-api test: ${table}`)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from,
    rpc,
  }
}

describe('POST /api/lists/[id]/import/commit', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    vi.mocked(ingestGooglePlaceAsCandidate).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ authenticated: false }))

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJx' }],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(401)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('unauthorized')
  })

  it('returns 400 for invalid JSON body', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json{',
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('invalid_import_commit_payload')
  })

  it('returns 400 when confirmed_rows is empty', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmed_rows: [] }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(400)
  })

  it('returns 404 when list is not found', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClient({ listRow: null }))

    const response = await POST(
      new Request('http://localhost/api/lists/missing/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJx' }],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'missing' } }
    )

    expect(response.status).toBe(404)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('list_not_found')
  })

  it('returns 400 when scheduled_date is outside list trip bounds', async () => {
    createClientMock.mockResolvedValue(
      makeSupabaseClient({
        listRow: {
          id: 'list-1',
          start_date: '2026-04-01',
          end_date: '2026-04-03',
        },
      })
    )

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [
            {
              row_index: 0,
              google_place_id: 'ChIJx',
              scheduled_date: '2026-03-30',
              scheduled_slot: 'morning',
            },
          ],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(400)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('date_outside_trip_range')
  })

  it('returns 200 with created row after promote_place_candidate', async () => {
    vi.mocked(ingestGooglePlaceAsCandidate).mockResolvedValue({
      candidate: { id: 'cand-1' },
    } as Awaited<ReturnType<typeof ingestGooglePlaceAsCandidate>>)
    createClientMock.mockResolvedValue(makeSupabaseClientPromoteSuccess())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJnewPlace000000' }],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      committed: Array<{ row_index: number; status: string; place_id: string; list_item_id: string }>
      errors: unknown[]
    }
    expect(json.errors).toHaveLength(0)
    expect(json.committed).toHaveLength(1)
    expect(json.committed[0].status).toBe('created')
    expect(json.committed[0].place_id).toBe('place-promoted-1')
    expect(json.committed[0].list_item_id).toBe('list-item-1')
  })

  it('returns 200 with status updated when place is already on the list', async () => {
    createClientMock.mockResolvedValue(makeSupabaseClientDuplicateOnList())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [{ row_index: 0, google_place_id: 'ChIJdupPlace000000' }],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    expect(vi.mocked(ingestGooglePlaceAsCandidate)).not.toHaveBeenCalled()
    const json = (await response.json()) as {
      committed: Array<{ status: string; place_id: string }>
      errors: unknown[]
    }
    expect(json.errors).toHaveLength(0)
    expect(json.committed[0].status).toBe('updated')
    expect(json.committed[0].place_id).toBe('place-existing')
  })

  it('returns 200 with both committed and errors for partial row success', async () => {
    vi.mocked(ingestGooglePlaceAsCandidate)
      .mockResolvedValueOnce({
        candidate: { id: 'cand-row0' },
      } as Awaited<ReturnType<typeof ingestGooglePlaceAsCandidate>>)
      .mockRejectedValueOnce(new IngestGooglePlaceError('ingest failed for row 1'))

    createClientMock.mockResolvedValue(makeSupabaseClientPartialSuccess())

    const response = await POST(
      new Request('http://localhost/api/lists/list-1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmed_rows: [
            { row_index: 0, google_place_id: 'ChIJrow0ok00000000' },
            { row_index: 1, google_place_id: 'ChIJrow1bad0000000' },
          ],
        }),
      }) as import('next/server').NextRequest,
      { params: { id: 'list-1' } }
    )

    expect(response.status).toBe(200)
    const json = (await response.json()) as {
      committed: Array<{ row_index: number }>
      errors: Array<{ row_index: number; error_message: string }>
    }
    expect(json.committed).toHaveLength(1)
    expect(json.committed[0].row_index).toBe(0)
    expect(json.errors).toHaveLength(1)
    expect(json.errors[0].row_index).toBe(1)
    expect(json.errors[0].error_message).toContain('ingest failed')
  })
})
