import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { GET, POST } from '@/app/api/enrichment/user-sources/route'

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000'

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/enrichment/user-sources', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeClient(options: {
  authenticated?: boolean
  upsertError?: { message: string } | null
  rpcError?: { message: string } | null
  rpcData?: unknown
} = {}) {
  const authenticated = options.authenticated ?? true
  const upsertMock = vi
    .fn()
    .mockResolvedValue(
      options.upsertError ? { error: options.upsertError } : { error: null }
    )
  const fromMock = vi.fn(() => ({
    upsert: upsertMock,
  }))
  const rpcMock = vi.fn().mockResolvedValue(
    options.rpcError
      ? { data: null, error: options.rpcError }
      : { data: options.rpcData ?? [], error: null }
  )

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticated ? { id: 'user-1' } : null },
        }),
      },
      from: fromMock,
      rpc: rpcMock,
    },
    upsertMock,
    fromMock,
    rpcMock,
  }
}

describe('/api/enrichment/user-sources', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      const mock = makeClient({ authenticated: false })
      createClientMock.mockResolvedValue(mock.client)

      const response = await POST(makePostRequest({ source_id: SAMPLE_UUID }))
      expect(response.status).toBe(401)
      expect(mock.fromMock).not.toHaveBeenCalled()
    })

    it('returns 400 when source_id is missing or not a valid UUID', async () => {
      const mock = makeClient()
      createClientMock.mockResolvedValue(mock.client)

      const missing = await POST(makePostRequest({}))
      expect(missing.status).toBe(400)

      const bad = await POST(makePostRequest({ source_id: 'not-a-uuid' }))
      expect(bad.status).toBe(400)

      expect(mock.upsertMock).not.toHaveBeenCalled()
    })

    it('upserts and returns 200 { ok: true }', async () => {
      const mock = makeClient()
      createClientMock.mockResolvedValue(mock.client)

      const response = await POST(makePostRequest({ source_id: SAMPLE_UUID }))
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ ok: true })
      expect(mock.upsertMock).toHaveBeenCalledWith(
        { user_id: 'user-1', source_id: SAMPLE_UUID },
        { onConflict: 'user_id,source_id', ignoreDuplicates: true }
      )
    })

    it('returns 400 on foreign key error for unknown source_id', async () => {
      const mock = makeClient({
        upsertError: {
          message:
            'insert or update on table "user_social_sources" violates foreign key constraint "user_social_sources_source_id_fkey"',
        },
      })
      createClientMock.mockResolvedValue(mock.client)

      const response = await POST(makePostRequest({ source_id: SAMPLE_UUID }))
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: 'Invalid source_id',
      })
    })
  })

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      const mock = makeClient({ authenticated: false })
      createClientMock.mockResolvedValue(mock.client)

      const response = await GET()
      expect(response.status).toBe(401)
      expect(mock.rpcMock).not.toHaveBeenCalled()
    })

    it('returns { sources } from list_user_social_sources RPC', async () => {
      const rows = [
        {
          source_id: SAMPLE_UUID,
          created_at: '2026-01-01T00:00:00.000Z',
          url: 'https://youtube.com/watch?v=1',
          platform: 'youtube',
          title: 'T',
          author_name: 'A',
          author_persona: 'foodie',
          places: [],
        },
      ]
      const mock = makeClient({ rpcData: rows })
      createClientMock.mockResolvedValue(mock.client)

      const response = await GET()
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ sources: rows })
      expect(mock.rpcMock).toHaveBeenCalledWith('list_user_social_sources')
    })

    it('returns 500 when RPC fails', async () => {
      const mock = makeClient({ rpcError: { message: 'db boom' } })
      createClientMock.mockResolvedValue(mock.client)

      const response = await GET()
      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toMatchObject({ error: 'db boom' })
    })
  })
})
