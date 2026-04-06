import { create } from 'zustand'
import type { Persona } from '@/lib/social/extraction-contract'
import { PERSONA_VALUES } from '@/lib/social/extraction-contract'
import { fetchSocialPlaces, type SocialPlace } from '@/lib/social/queries'

const STORAGE_KEY = 'acerca:socialPersonas'

const ALLOWED_PERSONAS = new Set<string>(PERSONA_VALUES)

function isPersona(value: unknown): value is Persona {
  return typeof value === 'string' && ALLOWED_PERSONAS.has(value)
}

function reportStorageWarning(action: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[social-discovery] ${action}: ${message}`)
}

type SocialDiscoveryState = {
  selectedPersonas: Set<Persona>
  minMentions: number
  socialPlaces: SocialPlace[]
  isLoading: boolean
  error: string | null
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
    if (current.has(persona)) current.delete(persona)
    else current.add(persona)

    set({ selectedPersonas: current })

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
    } catch (error) {
      reportStorageWarning('Failed to persist persona filters', error)
    }

    void get().fetchPlaces()
  },

  clearPersonas: () => {
    set({ selectedPersonas: new Set<Persona>() })

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      reportStorageWarning('Failed to clear persisted persona filters', error)
    }

    void get().fetchPlaces()
  },

  setMinMentions: (n) => {
    set({ minMentions: n })
    void get().fetchPlaces()
  },

  fetchPlaces: async () => {
    set({ isLoading: true, error: null })

    const { selectedPersonas, minMentions } = get()
    const persona = selectedPersonas.size === 1 ? [...selectedPersonas][0] : null
    const { data, error } = await fetchSocialPlaces({
      persona,
      minMentions,
    })

    if (error) {
      set({ isLoading: false, error })
      return
    }

    const filtered =
      selectedPersonas.size > 1
        ? data.filter((place) => place.personas.some((p) => selectedPersonas.has(p)))
        : data

    set({
      socialPlaces: filtered,
      isLoading: false,
      error: null,
    })
  },
}))

export function hydrateSocialStore(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return

    const valid = parsed.filter((value): value is Persona => isPersona(value))
    useSocialDiscoveryStore.setState({ selectedPersonas: new Set(valid) })
  } catch (error) {
    reportStorageWarning('Failed to hydrate persona filters', error)
  }
}
