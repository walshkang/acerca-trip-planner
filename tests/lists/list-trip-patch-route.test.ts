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

  const from = vi
    .fn()
    .mockReturnValueOnce(listsFetchQuery)
    .mockReturnValueOnce(listsUpdateQuery)

  createClientMock.mockResolvedValue({
    auth: { getUser },
    rpc,
    from,
  })

  return { rpc, from, listsUpdateQuery }
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
})
