# Social Discovery S4.1 — useSocialDiscoveryStore

## What to build

A Zustand store that holds the social discovery UI state: which personas are selected, the fetched social places, loading/error state, and the fetch action. This is the single source of truth that all S4 UI components read from.

## Files to create

- `lib/state/useSocialDiscoveryStore.ts`

## Files to reference (read these first)

- `lib/state/useMapLayerStore.ts` — the closest analog. Shows the full pattern: Zustand `create`, typed state + actions, localStorage persistence, debounced server sync.
- `lib/state/useDiscoveryStore.ts` — shows how a more complex store handles async fetch actions and error state.
- `lib/social/queries.ts` — `fetchSocialPlaces()` and `SocialPlace` type (created in S3.2). This is what the store calls.
- `lib/social/extraction-contract.ts` — `PERSONA_VALUES` and `Persona` type (created in S2.1).

## Implementation

```typescript
import { create } from 'zustand'
import type { Persona } from '@/lib/social/extraction-contract'
import { PERSONA_VALUES } from '@/lib/social/extraction-contract'
import { fetchSocialPlaces, type SocialPlace } from '@/lib/social/queries'

const STORAGE_KEY = 'acerca:socialPersonas'

type SocialDiscoveryState = {
  // Filter state
  selectedPersonas: Set<Persona>       // empty Set = all personas shown (no filter)
  minMentions: number                  // default 1

  // Data state
  socialPlaces: SocialPlace[]
  isLoading: boolean
  error: string | null

  // Actions
  togglePersona: (persona: Persona) => void
  clearPersonas: () => void
  setMinMentions: (n: number) => void
  fetchPlaces: () => Promise<void>
}

export const useSocialDiscoveryStore = create<SocialDiscoveryState>((set, get) => ({
  selectedPersonas: new Set<Persona>(),
  minMentions: 1,
  socialPlaces: [],
  isLoading: false,
  error: null,

  togglePersona: (persona) => {
    const current = new Set(get().selectedPersonas)
    if (current.has(persona)) {
      current.delete(persona)
    } else {
      current.add(persona)
    }
    set({ selectedPersonas: current })
    // Persist to localStorage (array of strings, not Set)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
    } catch { /* ignore */ }
    // Re-fetch with new filter
    get().fetchPlaces()
  },

  clearPersonas: () => {
    set({ selectedPersonas: new Set() })
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    get().fetchPlaces()
  },

  setMinMentions: (n) => {
    set({ minMentions: n })
    get().fetchPlaces()
  },

  fetchPlaces: async () => {
    set({ isLoading: true, error: null })
    const { selectedPersonas, minMentions } = get()

    // If multiple personas selected, fetch all and filter client-side.
    // RPC only supports one persona at a time — union filtering is client-side for now.
    const { data, error } = await fetchSocialPlaces({
      persona: selectedPersonas.size === 1 ? [...selectedPersonas][0] : null,
      minMentions,
    })

    if (error) {
      set({ isLoading: false, error })
      return
    }

    // Client-side multi-persona filter (when >1 selected)
    const filtered = selectedPersonas.size > 1
      ? data.filter(p => p.personas.some(persona => selectedPersonas.has(persona)))
      : data

    set({ socialPlaces: filtered, isLoading: false })
  },
}))

// Hydrate persona selection from localStorage (call once on mount)
export function hydrateSocialStore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((v): v is Persona =>
          typeof v === 'string' && (PERSONA_VALUES as readonly string[]).includes(v)
        )
        useSocialDiscoveryStore.setState({ selectedPersonas: new Set(valid) })
      }
    }
  } catch { /* ignore */ }
}
```

## What NOT to do

- Don't persist to Supabase preferences — persona filter is ephemeral for v1
- Don't add viewport bounds filtering to the fetch yet — that's a future optimization
- Don't add the fetch call to ExploreShellPaper yet — that's wired in S4.3

## Verification

TypeScript compiles with no errors (`npx tsc --noEmit`). No runtime test needed — the store will be exercised by the S4 UI components.
