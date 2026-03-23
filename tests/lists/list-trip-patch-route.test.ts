import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { PATCH } from '@/app/api/lists/[id]/route'

type RpcResponse = {
  data: unknown
  error: { code?: string | null; message?: string | null } | null
}

function makePatchRequest(body: unknown, asRaw = false): Request {
  return new Request('http://localhost/api/lists/list-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: asRaw ? (body as string) : JSON.stringify(body),
  })
}

function mockAuthenticatedClient(rpcResponse: RpcResponse) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
  const single = vi.fn().mockResolvedValue(rpcResponse)
  const rpc = vi.fn().mockReturnValue({ single })

  createClientMock.mockResolvedValue({
    auth: { getUser },
    rpc,
  })

  return { getUser, rpc, single }
}

function mockAmbiguousRpcFallbackClient(args: {
  currentList: Record<string, unknown>
  updatedList: Record<string, unknown>
  scheduledItems?: Array<Record<string, unknown>>
}) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
  const rpc = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42702', message: 'column reference "id" is ambiguous' },
    }),
  })

  const listsFetchQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: args.currentList, error: null }),
  } as any
  listsFetchQuery.select.mockReturnValue(listsFetchQuery)
  listsFetchQuery.eq.mockReturnValue(listsFetchQuery)

  const listsUpdateQuery = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: args.updatedList, error: null }),
  } as any
  listsUpdateQuery.update.mockReturnValue(listsUpdateQuery)
  listsUpdateQuery.eq.mockReturnValue(listsUpdateQuery)
  listsUpdateQuery.select.mockReturnValue(listsUpdateQuery)

  // Track item updates for assertions
  const itemUpdates: Array<{ id: string; update: Record<string, unknown> }> = []

  const makeItemUpdateQuery = () => {
    const q = {
      update: vi.fn(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any
    q.update.mockImplementation((data: Record<string, unknown>) => {
      // We'll capture the id from the eq call
      const origEq = q.eq
      q.eq = vi.fn().mockImplementation((col: string, val: string) => {
        if (col === 'id') itemUpdates.push({ id: val, update: data })
        return { error: null }
      })
      return q
    })
    return q
  }

  // Build a list_items select query that supports chaining .eq().is().not()
  const makeItemsSelectQuery = (items: Array<Record<string, unknown>>) => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      not: vi.fn(),
      in: vi.fn().mockResolvedValue({ error: null }),
    } as any
    q.select.mockReturnValue(q)
    q.eq.mockReturnValue(q)
    q.is.mockReturnValue(q)
    q.not.mockReturnValue({ data: items, error: null })
    // Also resolve directly for cases that don't chain .not()
    q.then = undefined
    return q
  }

  const items = args.scheduledItems ?? []

  // from() call order in fallback:
  // 1. lists (fetch current)
  // 2. lists (update)
  // 3+ list_items queries (shift, then trim)
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'list_items') {
      // Each list_items call gets a fresh query that returns the items
      // or handles updates
      const q = {
        select: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        is: vi.fn(),
        not: vi.fn(),
        in: vi.fn().mockResolvedValue({ error: null }),
      } as any
      q.select.mockReturnValue(q)
      q.eq.mockReturnValue(q)
      q.is.mockReturnValue(q)
      q.not.mockResolvedValue({ data: items, error: null })
      q.update.mockImplementation((data: Record<string, unknown>) => {
        const inner = {
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            itemUpdates.push({ id: val, update: data })
            return { error: null }
          }),
          in: vi.fn().mockResolvedValue({ error: null }),
        }
        return inner
      })
      return q
    }
    return null
  })

  // Override first two from() calls to return lists queries
  const originalFrom = from.getMockImplementation()!
  let fromCallCount = 0
  from.mockImplementation((table: string) => {
    fromCallCount++
    if (fromCallCount === 1) return listsFetchQuery
    if (fromCallCount === 2) return listsUpdateQuery
    return originalFrom(table)
  })

  createClientMock.mockResolvedValue({
    auth: { getUser },
    rpc,
    from,
  })

  return { rpc, from, listsUpdateQuery, itemUpdates }
}

describe('PATCH /api/lists/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when user is unauthenticated', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await PATCH(makePatchRequest({ timezone: 'UTC' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(401)
  })

  it('returns 400 for malformed JSON payload', async () => {
    const { rpc } = mockAuthenticatedClient({ data: null, error: null })

    const response = await PATCH(makePatchRequest('{', true) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns 400 when payload is not a JSON object', async () => {
    const { rpc } = mockAuthenticatedClient({ data: null, error: null })

    const response = await PATCH(
      makePatchRequest('"not-an-object"', true) as any,
      {
        params: { id: 'list-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Request body must be a JSON object',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns 400 when no updatable fields are provided', async () => {
    const { rpc } = mockAuthenticatedClient({ data: null, error: null })

    const response = await PATCH(makePatchRequest({}) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'No updatable fields provided',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid start_date payload', async () => {
    const { rpc } = mockAuthenticatedClient({ data: null, error: null })

    const response = await PATCH(makePatchRequest({ start_date: '2026-13-01' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'start_date must be YYYY-MM-DD or null',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid timezone payload', async () => {
    const { rpc } = mockAuthenticatedClient({
      data: null,
      error: null,
    })

    const response = await PATCH(makePatchRequest({ timezone: 'Invalid/Timezone' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'timezone must be a valid IANA timezone string',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('maps rpc list-not-found error to 404', async () => {
    mockAuthenticatedClient({
      data: null,
      error: { code: 'P0002', message: 'List not found' },
    })

    const response = await PATCH(makePatchRequest({ start_date: '2026-02-10' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'List not found' })
  })

  it('maps rpc validation errors to 400', async () => {
    mockAuthenticatedClient({
      data: null,
      error: {
        code: '22023',
        message: 'start_date must be on or before end_date',
      },
    })

    const response = await PATCH(
      makePatchRequest({
        start_date: '2026-02-11',
        end_date: '2026-02-10',
      }) as any,
      {
        params: { id: 'list-1' },
      }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'start_date must be on or before end_date',
    })
  })

  it('maps unexpected rpc errors to 500', async () => {
    mockAuthenticatedClient({
      data: null,
      error: { code: 'XX000', message: 'Database exploded' },
    })

    const response = await PATCH(makePatchRequest({ timezone: 'UTC' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Database exploded' })
  })

  it('returns updated list on success and calls rpc with patch flags', async () => {
    const list = {
      id: 'list-1',
      name: 'Weekend',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: 'America/New_York',
    }
    const { rpc } = mockAuthenticatedClient({
      data: list,
      error: null,
    })

    const response = await PATCH(
      makePatchRequest({
        start_date: '2026-02-10',
        end_date: '2026-02-11',
        timezone: 'America/New_York',
      }) as any,
      {
        params: { id: 'list-1' },
      }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ list })
    expect(rpc).toHaveBeenCalledWith('patch_list_trip_dates', {
      p_list_id: 'list-1',
      p_has_start_date: true,
      p_start_date: '2026-02-10',
      p_has_end_date: true,
      p_end_date: '2026-02-11',
      p_has_timezone: true,
      p_timezone: 'America/New_York',
      p_max_trip_days: 60,
    })
  })

  it('falls back to direct table patch when rpc fails with ambiguous column error', async () => {
    const currentList = {
      id: 'list-1',
      name: 'Weekend',
      description: null,
      is_default: false,
      created_at: '2026-02-10T00:00:00.000Z',
      start_date: '2026-02-10',
      end_date: '2026-02-11',
      timezone: 'America/New_York',
    }
    const updatedList = {
      ...currentList,
      timezone: 'UTC',
    }

    const { rpc, from, listsUpdateQuery } = mockAmbiguousRpcFallbackClient({
      currentList,
      updatedList,
    })

    const response = await PATCH(makePatchRequest({ timezone: 'UTC' }) as any, {
      params: { id: 'list-1' },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ list: updatedList })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenNthCalledWith(1, 'lists')
    expect(from).toHaveBeenNthCalledWith(2, 'lists')
    expect(listsUpdateQuery.update).toHaveBeenCalledWith({
      timezone: 'UTC',
    })
  })

  describe('date-shift migration (fallback path)', () => {
    it('shifts items forward when start_date moves forward +2 days', async () => {
      const currentList = {
        id: 'list-1',
        name: 'Trip',
        description: null,
        is_default: false,
        created_at: '2026-03-01T00:00:00.000Z',
        start_date: '2026-03-23',
        end_date: '2026-03-27',
        timezone: 'Asia/Tokyo',
      }
      const updatedList = {
        ...currentList,
        start_date: '2026-03-25',
        end_date: '2026-03-29',
      }

      const { itemUpdates } = mockAmbiguousRpcFallbackClient({
        currentList,
        updatedList,
        scheduledItems: [
          { id: 'item-1', scheduled_date: '2026-03-23' },
          { id: 'item-2', scheduled_date: '2026-03-25' },
        ],
      })

      const response = await PATCH(
        makePatchRequest({
          start_date: '2026-03-25',
          end_date: '2026-03-29',
        }) as any,
        { params: { id: 'list-1' } }
      )

      expect(response.status).toBe(200)
      // Items should be shifted by +2 days
      const shiftUpdates = itemUpdates.filter((u) => u.update.scheduled_date)
      expect(shiftUpdates).toContainEqual({
        id: 'item-1',
        update: { scheduled_date: '2026-03-25' },
      })
      expect(shiftUpdates).toContainEqual({
        id: 'item-2',
        update: { scheduled_date: '2026-03-27' },
      })
    })

    it('shifts items backward when start_date moves backward -1 day', async () => {
      const currentList = {
        id: 'list-1',
        name: 'Trip',
        description: null,
        is_default: false,
        created_at: '2026-03-01T00:00:00.000Z',
        start_date: '2026-03-25',
        end_date: '2026-03-28',
        timezone: 'America/New_York',
      }
      const updatedList = {
        ...currentList,
        start_date: '2026-03-24',
        end_date: '2026-03-27',
      }

      const { itemUpdates } = mockAmbiguousRpcFallbackClient({
        currentList,
        updatedList,
        scheduledItems: [
          { id: 'item-1', scheduled_date: '2026-03-26' },
        ],
      })

      const response = await PATCH(
        makePatchRequest({
          start_date: '2026-03-24',
          end_date: '2026-03-27',
        }) as any,
        { params: { id: 'list-1' } }
      )

      expect(response.status).toBe(200)
      const shiftUpdates = itemUpdates.filter((u) => u.update.scheduled_date)
      expect(shiftUpdates).toContainEqual({
        id: 'item-1',
        update: { scheduled_date: '2026-03-25' },
      })
    })

    it('does not shift items when only end_date changes', async () => {
      const currentList = {
        id: 'list-1',
        name: 'Trip',
        description: null,
        is_default: false,
        created_at: '2026-03-01T00:00:00.000Z',
        start_date: '2026-03-23',
        end_date: '2026-03-27',
        timezone: 'UTC',
      }
      const updatedList = {
        ...currentList,
        end_date: '2026-03-25',
      }

      const { itemUpdates } = mockAmbiguousRpcFallbackClient({
        currentList,
        updatedList,
        scheduledItems: [
          { id: 'item-1', scheduled_date: '2026-03-24' },
          { id: 'item-2', scheduled_date: '2026-03-27' },
        ],
      })

      const response = await PATCH(
        makePatchRequest({ end_date: '2026-03-25' }) as any,
        { params: { id: 'list-1' } }
      )

      expect(response.status).toBe(200)
      // No shift updates — only trim (item-2 is out of range, handled by trim step)
      const shiftUpdates = itemUpdates.filter(
        (u) => u.update.scheduled_date && u.update.scheduled_date !== null
      )
      expect(shiftUpdates).toHaveLength(0)
    })

    it('preserves dateless-to-dated transition (no shift, backfill day_index)', async () => {
      const currentList = {
        id: 'list-1',
        name: 'Trip',
        description: null,
        is_default: false,
        created_at: '2026-03-01T00:00:00.000Z',
        start_date: null,
        end_date: null,
        timezone: null,
      }
      const updatedList = {
        ...currentList,
        start_date: '2026-03-23',
        end_date: '2026-03-27',
        timezone: 'UTC',
      }

      // Items with day_index should get scheduled_date backfilled
      mockAmbiguousRpcFallbackClient({
        currentList,
        updatedList,
        scheduledItems: [{ id: 'item-1', day_index: 1 }],
      })

      const response = await PATCH(
        makePatchRequest({
          start_date: '2026-03-23',
          end_date: '2026-03-27',
          timezone: 'UTC',
        }) as any,
        { params: { id: 'list-1' } }
      )

      expect(response.status).toBe(200)
    })
  })
})
