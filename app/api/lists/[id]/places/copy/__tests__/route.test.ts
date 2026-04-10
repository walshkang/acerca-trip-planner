import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/lists/[id]/places/copy/route'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const LIST_ID = '850e8400-e29b-41d4-a716-446655440004'
const RESEARCH_LIST_ID = '960e8400-e29b-41d4-a716-446655440005'
const RESEARCH_SOURCE_ID = 'a50e8400-e29b-41d4-a716-446655440006'
const RESEARCH_PLACE_ID = 'b50e8400-e29b-41d4-a716-446655440007'
const PLACE_ID = 'c50e8400-e29b-41d4-a716-446655440008'
const LIST_ITEM_ID = 'd50e8400-e29b-41d4-a716-446655440009'

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/lists/123/places/copy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function clientUnauthorized() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(),
  }
}

function clientHappy() {
  const rp = {
    id: RESEARCH_PLACE_ID,
    name: 'Research Place',
    address: '1 Main St',
    lat: 37.123,
    lng: -122.123,
    place_id: 'gplace-1',
    research_source_id: RESEARCH_SOURCE_ID,
  }

  const rs = { id: RESEARCH_SOURCE_ID, research_list_id: RESEARCH_LIST_ID }
  const rl = { id: RESEARCH_LIST_ID, user_id: USER_ID }

  const listsMaybeSingle = vi.fn().mockResolvedValue({ data: { id: LIST_ID, user_id: USER_ID }, error: null })
  const listsEq = vi.fn().mockReturnValue({ maybeSingle: listsMaybeSingle })
  const listsSelect = vi.fn().mockReturnValue({ eq: listsEq })

  const rpMaybeSingle = vi.fn().mockResolvedValue({ data: rp, error: null })
  const rpEq = vi.fn().mockReturnValue({ maybeSingle: rpMaybeSingle })
  const rpSelect = vi.fn().mockReturnValue({ eq: rpEq })

  const rsMaybeSingle = vi.fn().mockResolvedValue({ data: rs, error: null })
  const rsEq = vi.fn().mockReturnValue({ maybeSingle: rsMaybeSingle })
  const rsSelect = vi.fn().mockReturnValue({ eq: rsEq })

  const rlMaybeSingle = vi.fn().mockResolvedValue({ data: rl, error: null })
  const rlEq = vi.fn().mockReturnValue({ maybeSingle: rlMaybeSingle })
  const rlSelect = vi.fn().mockReturnValue({ eq: rlEq })

  const upsertSingle = vi.fn().mockResolvedValue({ data: { id: PLACE_ID }, error: null })
  const upsertSelect = vi.fn().mockReturnValue({ single: upsertSingle })
  const upsert = vi.fn().mockReturnValue({ select: upsertSelect })

  const insertMaybeSingle = vi.fn().mockResolvedValue({ data: { id: LIST_ITEM_ID, list_id: LIST_ID, place_id: PLACE_ID }, error: null })
  const insertSelect = vi.fn().mockReturnValue({ maybeSingle: insertMaybeSingle })
  const insert = vi.fn().mockReturnValue({ select: insertSelect })

  const from = vi.fn((table: string) => {
    if (table === 'lists') return { select: listsSelect }
    if (table === 'research_places') return { select: rpSelect }
    if (table === 'research_sources') return { select: rsSelect }
    if (table === 'research_lists') return { select: rlSelect }
    if (table === 'places') return { upsert }
    if (table === 'list_items') return { insert }
    return {}
  })

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) },
    from,
    _upsert: upsert,
    _insert: insert,
  }
}

describe('/api/lists/[id]/places/copy', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockResolvedValue(clientUnauthorized())
    const res = await POST(
      jsonRequest({ research_source_id: RESEARCH_SOURCE_ID, research_place_id: RESEARCH_PLACE_ID }) as any,
      { params: { listId: LIST_ID } }
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid UUIDs', async () => {
    createClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }) },
      from: vi.fn(),
    })
    const res = await POST(jsonRequest({ research_source_id: 'bad', research_place_id: 'also-bad' }) as any, {
      params: { listId: LIST_ID },
    })
    expect(res.status).toBe(400)
  })

  it('upserts place and inserts list_item on success', async () => {
    const mock = clientHappy()
    createClientMock.mockResolvedValue(mock)

    const res = await POST(jsonRequest({ research_source_id: RESEARCH_SOURCE_ID, research_place_id: RESEARCH_PLACE_ID }) as any, {
      params: { listId: LIST_ID },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item).toEqual({ id: LIST_ITEM_ID, list_id: LIST_ID, place_id: PLACE_ID })
    expect(mock._upsert).toHaveBeenCalled()
    expect(mock._insert).toHaveBeenCalled()
    expect(mock._insert.mock.calls[0][0]).toEqual({ list_id: LIST_ID, place_id: PLACE_ID })
  })
})
