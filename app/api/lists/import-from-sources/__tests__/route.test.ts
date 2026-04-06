import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { POST } from '@/app/api/lists/import-from-sources/route'

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const PLACE_A = '650e8400-e29b-41d4-a716-446655440002'
const PLACE_B = '750e8400-e29b-41d4-a716-446655440003'
const LIST_ID = '850e8400-e29b-41d4-a716-446655440004'

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/lists/import-from-sources', {
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

function clientHappyNewList() {
  const insertListSingle = vi.fn().mockResolvedValue({
    data: { id: LIST_ID, name: 'New list', user_id: USER_ID },
    error: null,
  })
  const insertList = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: insertListSingle,
    }),
  })

  const placesIn = vi.fn().mockResolvedValue({
    data: [
      { id: PLACE_A, name: 'Place A' },
      { id: PLACE_B, name: 'Place B' },
    ],
    error: null,
  })
  const placesEq = vi.fn().mockReturnValue({ in: placesIn })
  const placesSelect = vi.fn().mockReturnValue({ eq: placesEq })

  const existingItemsIn = vi.fn().mockResolvedValue({
    data: [],
    error: null,
  })
  const existingItemsEq = vi.fn().mockReturnValue({ in: existingItemsIn })
  const existingItemsSelect = vi.fn().mockReturnValue({ eq: existingItemsEq })

  const insertItem = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'lists') {
      return { insert: insertList, select: vi.fn() }
    }
    if (table === 'places') {
      return { select: placesSelect }
    }
    if (table === 'list_items') {
      return {
        select: existingItemsSelect,
        insert: insertItem,
      }
    }
    return {}
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from,
    _insertList: insertList,
    _insertItem: insertItem,
  }
}

describe('/api/lists/import-from-sources', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockResolvedValue(clientUnauthorized())
    const res = await POST(
      jsonRequest({
        mode: 'new',
        new_list_name: 'X',
        items: [],
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when mode is invalid', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn(),
    })
    const res = await POST(jsonRequest({ mode: 'bogus', items: [] }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toMatch(/mode/)
  })

  it('returns 400 when mode is new but new_list_name is missing', async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn(),
    })
    const res = await POST(jsonRequest({ mode: 'new', items: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when a place_id is not owned / missing', async () => {
    const placesIn = vi.fn().mockResolvedValue({
      data: [{ id: PLACE_A, name: 'A' }],
      error: null,
    })
    const placesEq = vi.fn().mockReturnValue({ in: placesIn })
    const placesSelect = vi.fn().mockReturnValue({ eq: placesEq })

    const insertListSingle = vi.fn().mockResolvedValue({
      data: { id: LIST_ID, name: 'L', user_id: USER_ID },
      error: null,
    })
    const insertList = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertListSingle }),
    })

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'lists') return { insert: insertList }
        if (table === 'places') return { select: placesSelect }
        return {}
      }),
    })

    const res = await POST(
      jsonRequest({
        mode: 'new',
        new_list_name: 'Trip',
        items: [
          { place_id: PLACE_A },
          { place_id: PLACE_B },
        ],
      })
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toMatch(/places/i)
  })

  it('creates a new list and inserts items', async () => {
    const mock = clientHappyNewList()
    createClientMock.mockResolvedValue(mock)

    const res = await POST(
      jsonRequest({
        mode: 'new',
        new_list_name: 'New list',
        items: [
          { place_id: PLACE_A, day_index: 1, tags: ['foo'] },
          { place_id: PLACE_B },
        ],
      })
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      list_id: string
      list_name: string
      inserted_count: number
      duplicate_items: unknown[]
    }
    expect(body.list_id).toBe(LIST_ID)
    expect(body.list_name).toBe('New list')
    expect(body.inserted_count).toBe(2)
    expect(body.duplicate_items).toEqual([])
    expect(mock._insertItem).toHaveBeenCalled()
  })
})
