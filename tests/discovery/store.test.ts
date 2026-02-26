import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'

function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

function resetDiscoveryStore() {
  useDiscoveryStore.setState({
    query: '',
    isSubmitting: false,
    error: null,
    results: [],
    selectedResult: null,
    selectedResultId: null,
    candidate: null,
    previewCandidate: null,
    ghostLocation: null,
    enrichment: null,
    previewEnrichment: null,
    previewGoogle: null,
    searchBias: null,
    listScopeId: null,
  })
}

describe('useDiscoveryStore.submit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    resetDiscoveryStore()
  })

  it('posts discovery suggest with list scope and map bias for text queries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({
        status: 'ok',
        suggestions: [
          {
            source: 'places_index',
            source_id: 'place-1',
            name: 'Alpha',
            address: '1 Main St',
            lat: 40.7,
            lng: -73.9,
            neighborhood: 'West Village',
            borough: 'Manhattan',
            matched_place_id: null,
            score: 2000,
            rank: 1,
            reasons: ['places_index'],
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useDiscoveryStore.getState()
    store.setQuery('date night')
    store.setListScopeId('550e8400-e29b-41d4-a716-446655440000')
    store.setSearchBias({ lat: 40.71, lng: -73.99, radiusMeters: 9876.4 })

    await useDiscoveryStore.getState().submit()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/discovery/suggest')
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      intent: 'date night',
      list_id: '550e8400-e29b-41d4-a716-446655440000',
      lat: 40.71,
      lng: -73.99,
      radius_m: 9876,
      limit: 6,
      include_summary: false,
    })

    const state = useDiscoveryStore.getState()
    expect(state.results).toHaveLength(1)
    expect(state.results[0]?.canonical_place_id).toBe('place-1')
  })

  it('surfaces deterministic discovery error messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse(
        {
          code: 'invalid_discovery_payload',
          message: 'Discovery suggest payload is invalid',
        },
        false,
        400
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useDiscoveryStore.getState()
    store.setQuery('bad payload')
    await useDiscoveryStore.getState().submit()

    expect(useDiscoveryStore.getState().error).toBe(
      'invalid_discovery_payload: Discovery suggest payload is invalid'
    )
  })

  it('keeps direct Google place-id input on ingest path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeResponse({
        candidate: null,
        location: null,
        enrichment: null,
        google: null,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const store = useDiscoveryStore.getState()
    store.setQuery('ChIJN1t_tDeuEmsRUsoyG83frY4')
    await useDiscoveryStore.getState().submit()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/places/ingest')
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      input: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      include_wikipedia: true,
      schema_version: 2,
    })
  })
})

describe('useDiscoveryStore.discardAndClear', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    resetDiscoveryStore()
  })

  it('clears state immediately and does not call discard when no preview candidate', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const store = useDiscoveryStore.getState()
    store.setQuery('foo')
    store.setResults([{ place_id: 'x', name: 'X', canonical_place_id: null } as any])
    store.discardAndClear()

    const state = useDiscoveryStore.getState()
    expect(state.query).toBe('')
    expect(state.results).toEqual([])
    expect(state.previewCandidate).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears state and fires discard request when preview candidate exists', () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    const candidateId = '550e8400-e29b-41d4-a716-446655440000'
    useDiscoveryStore.setState({
      previewCandidate: {
        id: candidateId,
        name: 'Test',
        address: null,
        status: 'enriched',
        enrichment_id: 'e1',
        created_at: new Date().toISOString(),
      },
      previewEnrichment: {} as any,
      ghostLocation: { lat: 40, lng: -74 },
    })

    useDiscoveryStore.getState().discardAndClear()

    const state = useDiscoveryStore.getState()
    expect(state.previewCandidate).toBeNull()
    expect(state.previewEnrichment).toBeNull()
    expect(state.ghostLocation).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/places/discard')
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(requestInit.body)) as Record<string, unknown>
    expect(body).toEqual({ candidate_id: candidateId })
  })

  it('does not fire discard when preview candidate status is promoted', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    useDiscoveryStore.setState({
      previewCandidate: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        address: null,
        status: 'promoted',
        enrichment_id: 'e1',
        created_at: new Date().toISOString(),
      },
    })

    useDiscoveryStore.getState().discardAndClear()

    expect(useDiscoveryStore.getState().previewCandidate).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
