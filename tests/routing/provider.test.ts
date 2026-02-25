import { describe, expect, it } from 'vitest'
import {
  getRoutingPreviewProvider,
  resolveRoutingProviderKind,
} from '@/lib/routing/provider'

const BASE_INPUT = {
  canonicalRequest: { date: '2026-03-01', mode: 'scheduled' as const },
  list: {
    id: 'list-1',
    name: 'Weekend',
    timezone: 'America/New_York',
    start_date: null,
    end_date: null,
  },
  sequence: [],
  routeableSequence: [],
  legDrafts: [],
}

describe('routing provider boundary', () => {
  it('defaults unknown and empty provider values to unimplemented', () => {
    expect(resolveRoutingProviderKind(undefined)).toBe('unimplemented')
    expect(resolveRoutingProviderKind(null)).toBe('unimplemented')
    expect(resolveRoutingProviderKind('')).toBe('unimplemented')
    expect(resolveRoutingProviderKind('   ')).toBe('unimplemented')
    expect(resolveRoutingProviderKind('made_up_provider')).toBe('unimplemented')
  })

  it('normalizes accepted provider values', () => {
    expect(resolveRoutingProviderKind(' unimplemented ')).toBe('unimplemented')
    expect(resolveRoutingProviderKind('GOOGLE_ROUTES')).toBe('google_routes')
    expect(resolveRoutingProviderKind(' OsRm ')).toBe('osrm')
  })

  it('returns adapter with expected provider from factory', () => {
    expect(getRoutingPreviewProvider('google_routes').provider).toBe('google_routes')
    expect(getRoutingPreviewProvider('osrm').provider).toBe('osrm')
    expect(getRoutingPreviewProvider('invalid').provider).toBe('unimplemented')
  })

  it('returns deterministic provider_unavailable results for all providers', async () => {
    const providers = ['unimplemented', 'google_routes', 'osrm'] as const

    for (const provider of providers) {
      const adapter = getRoutingPreviewProvider(provider)
      const result = await adapter.preview(BASE_INPUT)

      expect(result).toEqual({
        ok: false,
        code: 'provider_unavailable',
        provider,
        message:
          provider === 'unimplemented'
            ? 'Routing provider integration is not implemented yet.'
            : `Routing provider "${provider}" is configured but not implemented yet.`,
        retryable: false,
      })
    }
  })
})
