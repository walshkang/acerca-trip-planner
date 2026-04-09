import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/lists/[id]/items/route'

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/lists/list-1/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/lists/[id]/items', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when user is unauthenticated', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const response = await POST(makePostRequest({ place_id: 'place-1' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(401)
  })

  it('returns 404 when social place exists but user has no attached sources', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const listsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'list-1' }, error: null }),
    } as any

    const placesQueryOwn = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any

    const placesQuerySocial = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'place-1', enrichment_id: null }, error: null }),
    } as any

    const listSourcesQuery = { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any

    let placesCall = 0
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'lists') return listsQuery
      if (table === 'places') {
        placesCall++
        return placesCall === 1 ? placesQueryOwn : placesQuerySocial
      }
      if (table === 'list_sources') return listSourcesQuery
      // Default: harmless responder
      return { select: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }
    })

    createClientMock.mockResolvedValue({ auth: { getUser }, from })

    const response = await POST(makePostRequest({ place_id: 'place-1' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Place not found' })
  })
})
