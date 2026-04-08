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
})
