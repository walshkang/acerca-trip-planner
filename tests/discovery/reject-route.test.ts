import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/places/discard/route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/places/discard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeSupabaseClient(options: {
  authenticated?: boolean
  rpcError?: { message: string } | null
} = {}) {
  const authenticated = options.authenticated ?? true
  const rpcSpy = vi
    .fn()
    .mockResolvedValue(options.rpcError ? { error: options.rpcError } : { data: null, error: null })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: 'user-1' } : null },
        }),
      },
      rpc: rpcSpy,
    },
    rpcSpy,
  }
}

describe('POST /api/places/discard (reject/discard path)', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const mock = makeSupabaseClient({ authenticated: false })
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(
      makeRequest({ candidate_id: '550e8400-e29b-41d4-a716-446655440000' })
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'unauthorized',
      message: 'Unauthorized',
    })
    expect(mock.rpcSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when candidate_id is missing', async () => {
    const mock = makeSupabaseClient()
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_discard_payload',
      message: 'candidate_id is required',
    })
    expect(mock.rpcSpy).not.toHaveBeenCalled()
  })

  it('returns 400 when candidate_id is not a string', async () => {
    const mock = makeSupabaseClient()
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(makeRequest({ candidate_id: 123 }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_discard_payload',
    })
    expect(mock.rpcSpy).not.toHaveBeenCalled()
  })

  it('calls discard_place_candidate RPC and returns 200 on success', async () => {
    const candidateId = '550e8400-e29b-41d4-a716-446655440000'
    const mock = makeSupabaseClient()
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(makeRequest({ candidate_id: candidateId }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
    expect(mock.rpcSpy).toHaveBeenCalledTimes(1)
    expect(mock.rpcSpy).toHaveBeenCalledWith('discard_place_candidate', {
      p_candidate_id: candidateId,
    })
  })

  it('returns 500 when RPC returns error', async () => {
    const mock = makeSupabaseClient({
      rpcError: { message: 'Candidate not found' },
    })
    createClientMock.mockResolvedValue(mock.client)

    const response = await POST(
      makeRequest({ candidate_id: '550e8400-e29b-41d4-a716-446655440000' })
    )
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      code: 'internal_error',
      message: expect.stringContaining('Candidate not found'),
    })
  })

  it('is idempotent: repeat discard returns 200', async () => {
    const candidateId = '550e8400-e29b-41d4-a716-446655440001'
    const mock = makeSupabaseClient()
    createClientMock.mockResolvedValue(mock.client)

    const first = await POST(makeRequest({ candidate_id: candidateId }))
    const second = await POST(makeRequest({ candidate_id: candidateId }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mock.rpcSpy).toHaveBeenCalledTimes(2)
  })
})
