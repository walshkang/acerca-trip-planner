import { create } from 'zustand'

export type MapLayer = 'default' | 'transit' | 'terrain'

export const MAP_LAYERS = ['default', 'transit', 'terrain'] as const satisfies readonly MapLayer[]

export type TransitMode = 'subway' | 'bus' | 'rail' | 'ferry'

export const TRANSIT_MODES = ['subway', 'bus', 'rail', 'ferry'] as const satisfies readonly TransitMode[]

const DEFAULT_TRANSIT_MODES: TransitMode[] = ['subway']

const STORAGE_KEY_LAYER = 'acerca:mapLayer'
const STORAGE_KEY_TRANSIT_MODES = 'acerca:transitModes'

const ALLOWED_MODES = new Set<string>(TRANSIT_MODES)

function isMapLayer(value: unknown): value is MapLayer {
  return typeof value === 'string' && (MAP_LAYERS as readonly string[]).includes(value)
}

function normalizeTransitModes(raw: unknown): TransitMode[] {
  if (!Array.isArray(raw)) return [...DEFAULT_TRANSIT_MODES]
  const out: TransitMode[] = []
  const seen = new Set<TransitMode>()
  for (const item of raw) {
    if (typeof item !== 'string' || !ALLOWED_MODES.has(item)) continue
    const m = item as TransitMode
    if (seen.has(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out.length > 0 ? out : [...DEFAULT_TRANSIT_MODES]
}

type MapLayerState = {
  activeLayer: MapLayer
  transitModes: TransitMode[]
  hydrated: boolean
  setLayer: (layer: MapLayer) => void
  setTransitModes: (modes: TransitMode[]) => void
  hydrate: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedPersistPreferences(getState: () => MapLayerState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const { activeLayer, transitModes } = getState()
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map_layer: activeLayer,
          transit_modes: transitModes,
        }),
      })
    } catch {
      // ignore — logged-out or offline
    }
  }, 500)
}

export const useMapLayerStore = create<MapLayerState>((set, get) => ({
  activeLayer: 'default',
  transitModes: [...DEFAULT_TRANSIT_MODES],
  hydrated: false,

  setLayer: (layer) => {
    set({ activeLayer: layer })
    try {
      localStorage.setItem(STORAGE_KEY_LAYER, layer)
    } catch {
      // ignore
    }
    debouncedPersistPreferences(get)
  },

  setTransitModes: (modes) => {
    if (!Array.isArray(modes) || modes.length === 0) return
    const next = normalizeTransitModes(modes)
    set({ transitModes: next })
    try {
      localStorage.setItem(STORAGE_KEY_TRANSIT_MODES, JSON.stringify(next))
    } catch {
      // ignore
    }
    debouncedPersistPreferences(get)
  },

  hydrate: async () => {
    if (get().hydrated) return

    try {
      const storedLayer = localStorage.getItem(STORAGE_KEY_LAYER)
      if (isMapLayer(storedLayer)) {
        set({ activeLayer: storedLayer })
      }
    } catch {
      // ignore
    }

    try {
      const storedModes = localStorage.getItem(STORAGE_KEY_TRANSIT_MODES)
      if (storedModes) {
        const parsed: unknown = JSON.parse(storedModes)
        const modes = normalizeTransitModes(parsed)
        set({ transitModes: modes })
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const data = (await res.json()) as {
          map_layer?: unknown
          transit_modes?: unknown
        }
        const ml = data.map_layer
        if (isMapLayer(ml)) {
          set({ activeLayer: ml })
          try {
            localStorage.setItem(STORAGE_KEY_LAYER, ml)
          } catch {
            // ignore
          }
        }
        if (data.transit_modes !== undefined) {
          const modes = normalizeTransitModes(data.transit_modes)
          set({ transitModes: modes })
          try {
            localStorage.setItem(STORAGE_KEY_TRANSIT_MODES, JSON.stringify(modes))
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    set({ hydrated: true })
  },
}))
