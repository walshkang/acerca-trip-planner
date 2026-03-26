import { create } from 'zustand'

export type MapLayer = 'default' | 'transit' | 'terrain'

export const MAP_LAYERS = ['default', 'transit', 'terrain'] as const satisfies readonly MapLayer[]

const STORAGE_KEY = 'acerca:mapLayer'

function isMapLayer(value: unknown): value is MapLayer {
  return (
    typeof value === 'string' &&
    (MAP_LAYERS as readonly string[]).includes(value)
  )
}

type MapLayerState = {
  activeLayer: MapLayer
  hydrated: boolean
  setLayer: (layer: MapLayer) => void
  hydrate: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveToApi(layer: MapLayer) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_layer: layer }),
      })
    } catch {
      // ignore — logged-out or offline
    }
  }, 500)
}

export const useMapLayerStore = create<MapLayerState>((set, get) => ({
  activeLayer: 'default',
  hydrated: false,

  setLayer: (layer) => {
    set({ activeLayer: layer })
    try {
      localStorage.setItem(STORAGE_KEY, layer)
    } catch {
      // ignore
    }
    debouncedSaveToApi(layer)
  },

  hydrate: async () => {
    if (get().hydrated) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isMapLayer(stored)) {
        set({ activeLayer: stored })
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/user/preferences')
      if (res.ok) {
        const data = (await res.json()) as { map_layer?: unknown }
        const ml = data.map_layer
        if (isMapLayer(ml)) {
          set({ activeLayer: ml })
          try {
            localStorage.setItem(STORAGE_KEY, ml)
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
