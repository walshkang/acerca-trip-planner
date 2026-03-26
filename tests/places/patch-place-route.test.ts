import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { PATCH } from '@/app/api/places/[id]/route'

function patchRequest(placeId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/places/${placeId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeSupabaseForPatch(options: {
  authenticated?: boolean
  singleResult?: { data: unknown; error: unknown }
} = {}) {
  const authenticated = options.authenticated ?? true
  const singleMock = vi
    .fn()
    .mockResolvedValue(options.singleResult ?? { data: null, error: null })

  const mockFrom = vi.fn(() => ({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      }),
    }),
  }))

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: 'user-1' } : null },
        }),
      },
      from: mockFrom,
    },
    singleMock,
  }
}

describe('PATCH /api/places/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const mock = makeSupabaseForPatch({ authenticated: false })
    createClientMock.mockResolvedValue(mock.client)

    const res = await PATCH(patchRequest('p1', { category: 'Food' }), {
      params: { id: 'p1' },
    })
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
    expect(mock.singleMock).not.toHaveBeenCalled()
  })

  it('returns 400 when category is missing', async () => {
    const mock = makeSupabaseForPatch()
    createClientMock.mockResolvedValue(mock.client)

    const res = await PATCH(patchRequest('p1', {}), { params: { id: 'p1' } })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/category/i),
    })
  })

  it('returns 400 when category is not a valid enum value', async () => {
    const mock = makeSupabaseForPatch()
    createClientMock.mockResolvedValue(mock.client)

    const res = await PATCH(patchRequest('p1', { category: 'Invalid' }), {
      params: { id: 'p1' },
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/category must be one of/i),
    })
  })

  it('returns 200 with place row on success', async () => {
    const row = {
      id: 'p1',
      category: 'Coffee',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const mock = makeSupabaseForPatch({
      singleResult: { data: row, error: null },
    })
    createClientMock.mockResolvedValue(mock.client)

    const res = await PATCH(patchRequest('p1', { category: 'Coffee' }), {
      params: { id: 'p1' },
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ place: row })
    expect(mock.client.from).toHaveBeenCalledWith('places')
  })

  it('returns 404 when no row updated', async () => {
    const mock = makeSupabaseForPatch({
      singleResult: { data: null, error: { code: 'PGRST116', message: 'No rows' } },
    })
    createClientMock.mockResolvedValue(mock.client)

    const res = await PATCH(patchRequest('p1', { category: 'Food' }), {
      params: { id: 'p1' },
    })
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: 'Place not found' })
  })
})
