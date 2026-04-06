import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSocialPlaces } from '@/lib/social/queries'
import { getSupabase } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: vi.fn(),
}))

describe('fetchSocialPlaces', () => {
  const rpcMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabase).mockReturnValue({
      rpc: rpcMock,
    } as unknown as ReturnType<typeof getSupabase>)
  })

  it('maps persona and min mentions params for rpc', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await fetchSocialPlaces({ persona: 'foodie', minMentions: 3 })

    expect(rpcMock).toHaveBeenCalledWith('discover_social_places', {
      p_persona: 'foodie',
      p_min_mentions: 3,
    })
  })

  it('maps bounds into EWKT polygon param', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await fetchSocialPlaces({
      bounds: { west: 100, south: 13, east: 101, north: 14 },
    })

    expect(rpcMock).toHaveBeenCalledWith('discover_social_places', {
      p_bounds:
        'SRID=4326;POLYGON((100 13,101 13,101 14,100 14,100 13))',
    })
  })

  it('returns empty array when rpc returns null data', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })

    const result = await fetchSocialPlaces()

    expect(result).toEqual({ data: [], error: null })
  })

  it('returns rpc error message and empty data', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'rpc failed' },
    })

    const result = await fetchSocialPlaces()

    expect(result).toEqual({ data: [], error: 'rpc failed' })
  })
})
