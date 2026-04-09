import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchResearchPlaces } from '@/lib/social/research-queries'
import { getSupabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: vi.fn(),
}))

describe('fetchResearchPlaces', () => {
  const rpcMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabase).mockReturnValue({
      rpc: rpcMock,
    } as unknown as ReturnType<typeof getSupabase>)
  })

  it('passes list id and optional bounds to discover_research_places', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await fetchResearchPlaces({
      listId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      bounds: { west: 100, south: 13, east: 101, north: 14 },
    })

    expect(rpcMock).toHaveBeenCalledWith('discover_research_places', {
      p_list_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      p_bounds:
        'SRID=4326;POLYGON((100 13,101 13,101 14,100 14,100 13))',
    })
  })

  it('omits bounds when not provided', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await fetchResearchPlaces({ listId: 'list-uuid' })

    expect(rpcMock).toHaveBeenCalledWith('discover_research_places', {
      p_list_id: 'list-uuid',
    })
  })

  it('returns error message when RPC fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    const result = await fetchResearchPlaces({ listId: 'list-uuid' })

    expect(result.data).toEqual([])
    expect(result.error).toBe('RPC failed')
  })

  it('returns empty array when RPC returns null data', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    const result = await fetchResearchPlaces({ listId: 'list-uuid' })

    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it('handles malformed top_snippets gracefully', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          place_id: 'p1',
          name: 'Test Place',
          category: 'restaurant',
          lat: 13.7,
          lng: 100.5,
          overlap_count: 1,
          net_score: 0,
          user_vote: null,
          top_snippets: 'not-an-array',
        },
      ],
      error: null,
    })

    const result = await fetchResearchPlaces({ listId: 'list-uuid' })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].top_snippets).toEqual([])
  })

  it('normalizes unexpected vote values to null', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          place_id: 'p1',
          name: 'Test Place',
          category: 'restaurant',
          lat: 13.7,
          lng: 100.5,
          overlap_count: 2,
          net_score: 5,
          user_vote: 2,
          top_snippets: [],
        },
      ],
      error: null,
    })

    const result = await fetchResearchPlaces({ listId: 'list-uuid' })

    expect(result.data[0].user_vote).toBeNull()
  })
})
