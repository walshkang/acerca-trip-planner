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

describe('POST /api/lists/[id]/import/commit', () => {
  beforeEach(() => {
    createClientMock.mockReset()
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
})
