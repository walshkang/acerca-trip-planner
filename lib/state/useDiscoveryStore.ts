import { create } from 'zustand'

export type DiscoveryCandidate = {
  id: string
  name: string
  address: string | null
  status: string
  enrichment_id: string | null
  created_at: string
}

export type DiscoverySearchResult = {
  place_id: string
  name: string | null
  address: string | null
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

type DiscoveryState = {
  query: string
  isSubmitting: boolean
  error: string | null
  results: DiscoverySearchResult[]
  selectedResultId: string | null
  candidate: DiscoveryCandidate | null
  previewCandidate: DiscoveryCandidate | null
  ghostLocation: LatLng | null
  enrichment: DiscoveryEnrichment | null
  previewEnrichment: DiscoveryEnrichment | null
  setQuery: (v: string) => void
  setResults: (results: DiscoverySearchResult[]) => void
  setSelectedResultId: (id: string | null) => void
  setPreview: (input: {
    candidate: DiscoveryCandidate | null
    enrichment: DiscoveryEnrichment | null
    ghostLocation: LatLng | null
  }) => void
  clear: () => void
  submit: () => Promise<void>
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  query: '',
  isSubmitting: false,
  error: null,
  results: [],
  selectedResultId: null,
  candidate: null,
  previewCandidate: null,
  ghostLocation: null,
  enrichment: null,
  previewEnrichment: null,

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

  clear: () =>
    set({
      query: '',
      isSubmitting: false,
      error: null,
      results: [],
      selectedResultId: null,
      candidate: null,
      previewCandidate: null,
      ghostLocation: null,
      enrichment: null,
      previewEnrichment: null,
    }),

  submit: async () => {
    const q = get().query.trim()
    if (!q) return

    set({
      isSubmitting: true,
      error: null,
      results: [],
      selectedResultId: null,
      candidate: null,
      previewCandidate: null,
      ghostLocation: null,
      enrichment: null,
      previewEnrichment: null,
    })

    try {
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
      set({
        candidate,
        ghostLocation,
        enrichment,
        previewCandidate: candidate,
        previewEnrichment: enrichment,
      })
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      set({ isSubmitting: false })
    }
  },
}))
