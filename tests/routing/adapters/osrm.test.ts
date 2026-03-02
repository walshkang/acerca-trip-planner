import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOsrmAdapter } from '@/lib/routing/adapters/osrm'
import type { RoutingProviderInput } from '@/lib/routing/provider'

const globalFetch = vi.fn()
vi.stubGlobal('fetch', globalFetch)

function makeInput(
  overrides?: Partial<RoutingProviderInput>
): RoutingProviderInput {
  return {
    canonicalRequest: { date: '2026-03-01', mode: 'scheduled' },
    list: {
      id: 'list-1',
      name: 'Trip',
      timezone: 'America/New_York',
      start_date: '2026-03-01',
      end_date: '2026-03-03',
    },
    sequence: [],
    routeableSequence: [
      {
        item_id: 'item-a',
        place_id: 'place-a',
        place_name: 'Place A',
        category: 'Food',
        scheduled_date: '2026-03-01',
        scheduled_start_time: '10:00:00',
        scheduled_order: 1,
        created_at: '2026-01-01T00:00:00Z',
        slot: 'morning',
        slot_rank: 0,
        lat: 40.7128,
        lng: -74.006,
        routeable: true,
      },
      {
        item_id: 'item-b',
        place_id: 'place-b',
        place_name: 'Place B',
        category: 'Sights',
        scheduled_date: '2026-03-01',
        scheduled_start_time: '14:00:00',
        scheduled_order: 2,
        created_at: '2026-01-01T00:01:00Z',
        slot: 'afternoon',
        slot_rank: 1,
        lat: 40.7282,
        lng: -73.7949,
        routeable: true,
      },
    ],
    legDrafts: [
      {
        index: 0,
        from_item_id: 'item-a',
        to_item_id: 'item-b',
        from_place_id: 'place-a',
        to_place_id: 'place-b',
      },
    ],
    ...overrides,
  }
}

describe('OSRM adapter', () => {
  const ORIGINAL_OSRM_BASE_URL_EXISTS = Object.prototype.hasOwnProperty.call(
    process.env,
    'OSRM_BASE_URL'
  )
  const ORIGINAL_OSRM_BASE_URL = process.env.OSRM_BASE_URL

  beforeEach(() => {
    process.env.OSRM_BASE_URL = 'https://router.project-osrm.org'
    globalFetch.mockReset()
  })

  afterEach(() => {
    if (!ORIGINAL_OSRM_BASE_URL_EXISTS) {
      delete process.env.OSRM_BASE_URL
    } else {
      process.env.OSRM_BASE_URL = ORIGINAL_OSRM_BASE_URL
    }
  })

  it('returns provider_unavailable when OSRM_BASE_URL is not set', async () => {
    delete process.env.OSRM_BASE_URL
    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toEqual({
      ok: false,
      code: 'provider_unavailable',
      provider: 'osrm',
      message: 'OSRM_BASE_URL is not configured.',
      retryable: false,
    })
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('returns success result with per-leg metrics for a valid OSRM response', async () => {
    const osrmResponse = {
      code: 'Ok',
      routes: [
        {
          legs: [{ distance: 1250.5, duration: 420.3 }],
        },
      ],
    }
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => osrmResponse,
    })

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toEqual({
      ok: true,
      provider: 'osrm',
      legs: [{ index: 0, distance_m: 1250.5, duration_s: 420.3 }],
    })
  })

  it('builds coordinates in lng,lat order separated by semicolons', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [{ legs: [{ distance: 500, duration: 60 }] }],
      }),
    })

    const adapter = createOsrmAdapter()
    await adapter.preview(makeInput())

    expect(globalFetch).toHaveBeenCalledOnce()
    const calledUrl: string = globalFetch.mock.calls[0][0]
    expect(calledUrl).toContain('-74.006,40.7128;-73.7949,40.7282')
    expect(calledUrl).toContain('overview=false')
  })

  it('returns provider_error when OSRM code is not Ok', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 'NoRoute', message: 'No route found' }),
    })

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toMatchObject({
      ok: false,
      code: 'provider_error',
      provider: 'osrm',
      retryable: true,
    })
  })

  it('returns provider_error on network failure with retryable: true', async () => {
    globalFetch.mockRejectedValueOnce(new Error('Network failure'))

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toEqual({
      ok: false,
      code: 'provider_error',
      provider: 'osrm',
      message: 'Network failure',
      retryable: true,
    })
  })

  it('returns provider_error on non-200 HTTP response', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    })

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toMatchObject({
      ok: false,
      code: 'provider_error',
      provider: 'osrm',
      retryable: true,
    })
  })

  it('returns provider_error when response is missing route legs', async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [] }),
    })

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(makeInput())

    expect(result).toMatchObject({
      ok: false,
      code: 'provider_error',
      provider: 'osrm',
      retryable: true,
    })
  })

  it('returns empty legs when routeableSequence has fewer than 2 items', async () => {
    const input = makeInput({
      routeableSequence: [
        {
          item_id: 'item-a',
          place_id: 'place-a',
          place_name: 'Place A',
          category: 'Food',
          scheduled_date: '2026-03-01',
          scheduled_start_time: '10:00:00',
          scheduled_order: 1,
          created_at: '2026-01-01T00:00:00Z',
          slot: 'morning',
          slot_rank: 0,
          lat: 40.7128,
          lng: -74.006,
          routeable: true,
        },
      ],
      legDrafts: [],
    })

    const adapter = createOsrmAdapter()
    const result = await adapter.preview(input)

    expect(result).toEqual({ ok: true, provider: 'osrm', legs: [] })
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('has provider property set to osrm', () => {
    const adapter = createOsrmAdapter()
    expect(adapter.provider).toBe('osrm')
  })
})
