import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { PATCH } from '@/app/api/lists/[id]/items/[itemId]/route'

type RouteError = { code?: string | null; message?: string | null } | null

type RouteResult = {
  data: unknown
  error: RouteError
}

function makePatchRequest(body: unknown, asRaw = false): Request {
  return new Request('http://localhost/api/lists/list-1/items/item-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: asRaw ? (body as string) : JSON.stringify(body),
  })
}

function mockAuthenticatedClient(args: {
  routeResult: RouteResult
  userId?: string | null
}) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: args.userId === null ? null : { id: args.userId ?? 'user-1' },
    },
  })

  const single = vi.fn().mockResolvedValue(args.routeResult)
  const select = vi.fn().mockReturnValue({ single })
  const updateQuery = {
    eq: vi.fn(),
    select,
  } as {
    eq: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
  }
  updateQuery.eq.mockReturnValue(updateQuery)

  const update = vi.fn().mockReturnValue(updateQuery)
  const from = vi.fn().mockReturnValue({ update })

  createClientMock.mockResolvedValue({
    auth: { getUser },
    from,
  })

  return { getUser, from, update, updateQuery, select, single }
}

describe('PATCH /api/lists/[id]/items/[itemId]', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when user is unauthenticated', async () => {
    mockAuthenticatedClient({
      routeResult: { data: null, error: null },
      userId: null,
    })

    const response = await PATCH(
      makePatchRequest({ completed: true }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when no updatable fields are provided', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(makePatchRequest({}) as any, {
      params: { id: 'list-1', itemId: 'item-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'No updatable fields provided',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid scheduled_date payload', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(
      makePatchRequest({ scheduled_date: '2026-13-01' }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'scheduled_date must be YYYY-MM-DD or null',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 when scheduled_date is set without slot', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(
      makePatchRequest({ scheduled_date: '2026-02-11', scheduled_order: 1 }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'slot is required when scheduled_date is set',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 when slot is provided without scheduled_date', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(makePatchRequest({ slot: 'morning' }) as any, {
      params: { id: 'list-1', itemId: 'item-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'scheduled_date is required when slot is provided',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 when scheduling without scheduled_order', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(
      makePatchRequest({ scheduled_date: '2026-02-11', slot: 'morning' }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'scheduled_order is required when scheduling an item',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 when scheduled_date is null but slot is not null', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(
      makePatchRequest({
        scheduled_date: null,
        slot: 'evening',
      }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'slot must be null when scheduled_date is null',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid source value', async () => {
    const { from } = mockAuthenticatedClient({
      routeResult: { data: null, error: null },
    })

    const response = await PATCH(
      makePatchRequest({
        scheduled_date: '2026-02-11',
        slot: 'morning',
        scheduled_order: 1,
        source: 'manual',
      }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'source must be drag, tap_move, quick_add, or api',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('maps not-found update to 404', async () => {
    const { update } = mockAuthenticatedClient({
      routeResult: {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      },
    })

    const response = await PATCH(
      makePatchRequest({ scheduled_order: 2.5 }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'List item not found' })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('maps unexpected update failures to 500', async () => {
    const { update } = mockAuthenticatedClient({
      routeResult: {
        data: null,
        error: { code: 'XX000', message: 'Database exploded' },
      },
    })

    const response = await PATCH(
      makePatchRequest({ completed: true }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Database exploded' })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('persists scheduled slot/date/order and only scheduling audit fields', async () => {
    const item = {
      id: 'item-1',
      list_id: 'list-1',
      place_id: 'place-1',
      scheduled_date: '2026-02-11',
      scheduled_start_time: '14:00:00',
      scheduled_order: 3,
      completed_at: null,
      last_scheduled_at: '2026-02-10T00:00:00.000Z',
      last_scheduled_by: 'user-1',
      last_scheduled_source: 'tap_move',
    }
    const { update, updateQuery } = mockAuthenticatedClient({
      routeResult: { data: item, error: null },
    })

    const response = await PATCH(
      makePatchRequest({
        scheduled_date: '2026-02-11',
        slot: 'afternoon',
        scheduled_order: 3,
        source: 'tap_move',
        random_field: 'ignored',
      }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ item })

    const updates = update.mock.calls[0]?.[0] as Record<string, unknown>
    expect(updates).toEqual(
      expect.objectContaining({
        scheduled_date: '2026-02-11',
        scheduled_start_time: '14:00:00',
        scheduled_order: 3,
        last_scheduled_by: 'user-1',
        last_scheduled_source: 'tap_move',
      })
    )
    expect(typeof updates.last_scheduled_at).toBe('string')
    expect(Number.isNaN(Date.parse(String(updates.last_scheduled_at)))).toBe(false)
    expect(updates).not.toHaveProperty('random_field')

    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'item-1')
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'list_id', 'list-1')
  })

  it('clears scheduling fields when moved to backlog', async () => {
    const item = {
      id: 'item-1',
      list_id: 'list-1',
      place_id: 'place-1',
      scheduled_date: null,
      scheduled_start_time: null,
      scheduled_order: 0,
      completed_at: null,
      last_scheduled_at: '2026-02-10T00:00:00.000Z',
      last_scheduled_by: 'user-1',
      last_scheduled_source: 'api',
    }
    const { update } = mockAuthenticatedClient({
      routeResult: { data: item, error: null },
    })

    const response = await PATCH(
      makePatchRequest({ scheduled_date: null, slot: null }) as any,
      {
        params: { id: 'list-1', itemId: 'item-1' },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ item })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduled_date: null,
        scheduled_start_time: null,
        scheduled_order: 0,
        last_scheduled_source: 'api',
      })
    )
  })
})
