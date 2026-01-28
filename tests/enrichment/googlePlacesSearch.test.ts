import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchGooglePlaces } from '@/lib/enrichment/sources'

const originalFetch = globalThis.fetch
const originalApiKey = process.env.GOOGLE_PLACES_API_KEY

function mockFetch(data: unknown, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  }) as unknown as typeof fetch
}

describe('searchGooglePlaces', () => {
  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = 'test'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.GOOGLE_PLACES_API_KEY = originalApiKey
  })

  it('returns candidates for OK status', async () => {
    mockFetch({
      status: 'OK',
      candidates: [
        { place_id: 'abc', name: 'Cafe', formatted_address: '123 St' },
      ],
    })

    const results = await searchGooglePlaces('cafe')

    expect(results).toEqual([
      { place_id: 'abc', name: 'Cafe', formatted_address: '123 St' },
    ])
  })

  it('returns empty list for ZERO_RESULTS', async () => {
    mockFetch({ status: 'ZERO_RESULTS', candidates: [] })

    const results = await searchGooglePlaces('nope')

    expect(results).toEqual([])
  })
})
