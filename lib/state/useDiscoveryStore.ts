import { create } from 'zustand'

export type DiscoveryCandidate = {
  id: string
  name: string
  address: string | null
  status: string
  enrichment_id: string | null
  created_at: string
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
  candidate: DiscoveryCandidate | null
  ghostLocation: LatLng | null
  enrichment: DiscoveryEnrichment | null
  setQuery: (v: string) => void
  clear: () => void
  submit: () => Promise<void>
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  query: '',
  isSubmitting: false,
  error: null,
  candidate: null,
  ghostLocation: null,
  enrichment: null,

  setQuery: (v) => set({ query: v }),

  clear: () =>
    set({
      query: '',
      isSubmitting: false,
      error: null,
      candidate: null,
      ghostLocation: null,
      enrichment: null,
    }),

  submit: async () => {
    const q = get().query.trim()
    if (!q) return

    set({
      isSubmitting: true,
      error: null,
      candidate: null,
      ghostLocation: null,
      enrichment: null,
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

      set({
        candidate: (json?.candidate ?? null) as DiscoveryCandidate | null,
        ghostLocation: (json?.location ?? null) as LatLng | null,
        enrichment: (json?.enrichment ?? null) as DiscoveryEnrichment | null,
      })
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      set({ isSubmitting: false })
    }
  },
}))

