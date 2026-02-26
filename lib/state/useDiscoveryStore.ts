import { create } from 'zustand'
import {
  isCanonicalRow,
  mapDiscoverySuggestionsToUiResults,
  type DiscoveryUiResult,
} from '@/lib/discovery/client'
import type {
  DiscoverySuggestErrorPayload,
  DiscoverySuggestSuccessPayload,
} from '@/lib/discovery/contract'

export type DiscoveryCandidate = {
  id: string
  name: string
  address: string | null
  status: string
  enrichment_id: string | null
  created_at: string
}

export type DiscoverySearchResult = DiscoveryUiResult

export type DiscoveryGoogleDetails = {
  website: string | null
  url: string | null
  types: string[] | null
  opening_hours:
    | {
        open_now: boolean | null
        weekday_text: string[] | null
      }
    | null
}

export type DiscoveryEnrichment = {
  curatedData: unknown | null
  normalizedData: unknown | null
  sourceHash: string
  model: string
  temperature: number
  promptVersion: string
}

type LatLng = { lat: number; lng: number }
type SearchBias = { lat: number; lng: number; radiusMeters: number }

type DiscoveryState = {
  query: string
  isSubmitting: boolean
  error: string | null
  results: DiscoverySearchResult[]
  selectedResult: DiscoverySearchResult | null
  selectedResultId: string | null
  candidate: DiscoveryCandidate | null
  previewCandidate: DiscoveryCandidate | null
  ghostLocation: LatLng | null
  enrichment: DiscoveryEnrichment | null
  previewEnrichment: DiscoveryEnrichment | null
  previewGoogle: DiscoveryGoogleDetails | null
  searchBias: SearchBias | null
  listScopeId: string | null
  setQuery: (v: string) => void
  setResults: (results: DiscoverySearchResult[]) => void
  setSelectedResultId: (id: string | null) => void
  setPreview: (input: {
    candidate: DiscoveryCandidate | null
    enrichment: DiscoveryEnrichment | null
    ghostLocation: LatLng | null
  }) => void
  setSearchBias: (bias: SearchBias | null) => void
  setListScopeId: (listId: string | null) => void
  clear: () => void
  submit: () => Promise<void>
  previewResult: (result: DiscoverySearchResult) => Promise<void>
}

function looksLikeGooglePlaceId(input: string): boolean {
  const s = input.trim()
  return s.startsWith('ChI') && s.length >= 20 && s.length <= 200
}

function looksLikeUrl(input: string): boolean {
  try {
    new URL(input)
    return true
  } catch {
    return false
  }
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
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

  setQuery: (v) => set({ query: v }),
  setResults: (results) => set({ results }),
  setSelectedResultId: (id) => set({ selectedResultId: id }),
  setPreview: ({ candidate, enrichment, ghostLocation }) =>
    set({
      candidate,
      enrichment,
      ghostLocation,
      previewCandidate: candidate,
      previewEnrichment: enrichment,
    }),
  setSearchBias: (bias) => set({ searchBias: bias }),
  setListScopeId: (listId) => set({ listScopeId: listId }),

  clear: () =>
    set({
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
    }),

  submit: async () => {
    const q = get().query.trim()
    if (!q) return

    set({
      isSubmitting: true,
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
    })

    try {
      if (looksLikeGooglePlaceId(q) || looksLikeUrl(q)) {
        set({ selectedResultId: q })
        const res = await fetch('/api/places/ingest', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: q,
            include_wikipedia: true,
            schema_version: 2,
          }),
        })

        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          set({ error: json?.error || `HTTP ${res.status}` })
          return
        }

        const candidate = (json?.candidate ?? null) as DiscoveryCandidate | null
        const ghostLocation = (json?.location ?? null) as LatLng | null
        const enrichment = (json?.enrichment ?? null) as DiscoveryEnrichment | null
        const previewGoogle =
          (json?.google ?? null) as DiscoveryGoogleDetails | null
        set({
          candidate,
          ghostLocation,
          enrichment,
          previewCandidate: candidate,
          previewEnrichment: enrichment,
          previewGoogle,
        })
        return
      }

      const suggestPayload: Record<string, unknown> = {
        intent: q,
        limit: 6,
        include_summary: false,
      }
      const listScopeId = get().listScopeId
      if (listScopeId) {
        suggestPayload.list_id = listScopeId
      }
      const bias = get().searchBias
      if (bias) {
        suggestPayload.lat = bias.lat
        suggestPayload.lng = bias.lng
        suggestPayload.radius_m = Math.round(bias.radiusMeters)
      }

      const res = await fetch('/api/discovery/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(suggestPayload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const payload = json as Partial<DiscoverySuggestErrorPayload> & {
          error?: unknown
        }
        const message =
          typeof payload.message === 'string'
            ? payload.message
            : typeof payload.error === 'string'
              ? payload.error
              : `HTTP ${res.status}`
        const code = typeof payload.code === 'string' ? payload.code : null
        set({ error: code ? `${code}: ${message}` : message })
        return
      }

      const payload = json as Partial<DiscoverySuggestSuccessPayload>
      set({
        results: Array.isArray(payload.suggestions)
          ? mapDiscoverySuggestionsToUiResults(payload.suggestions)
          : [],
      })
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      set({ isSubmitting: false })
    }
  },

  previewResult: async (result) => {
    if (isCanonicalRow(result) || !result?.place_id) return

    set({
      isSubmitting: true,
      error: null,
      results: [],
      selectedResult: result,
      selectedResultId: result.place_id,
      candidate: null,
      previewCandidate: null,
      ghostLocation: null,
      enrichment: null,
      previewEnrichment: null,
      previewGoogle: null,
    })

    try {
      const res = await fetch('/api/places/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          place_id: result.place_id,
          include_wikipedia: true,
          schema_version: 2,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        set({ error: json?.error || `HTTP ${res.status}` })
        return
      }

      const candidate = (json?.candidate ?? null) as DiscoveryCandidate | null
      const ghostLocation = (json?.location ?? null) as LatLng | null
      const enrichment = (json?.enrichment ?? null) as DiscoveryEnrichment | null
      const previewGoogle = (json?.google ?? null) as DiscoveryGoogleDetails | null
      set({
        candidate,
        ghostLocation,
        enrichment,
        previewCandidate: candidate,
        previewEnrichment: enrichment,
        previewGoogle,
      })
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      set({ isSubmitting: false })
    }
  },
}))
