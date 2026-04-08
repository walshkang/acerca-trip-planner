import { create } from 'zustand'

export type ViewportBounds = {
  west: number
  south: number
  east: number
  north: number
}

type ResearchWorkspaceState = {
  viewportBounds: ViewportBounds | null
  /** True after the map moved since the last "Search this area" action */
  searchAreaStale: boolean
  setViewportBounds: (b: ViewportBounds | null) => void
  /** Call after user clicks "Search this area" (successful fetch) */
  markSearchAreaFresh: () => void
}

export const useResearchWorkspaceStore = create<ResearchWorkspaceState>((set) => ({
  viewportBounds: null,
  searchAreaStale: false,

  setViewportBounds: (b) =>
    set(() => ({
      viewportBounds: b,
      searchAreaStale: b != null,
    })),

  markSearchAreaFresh: () => set({ searchAreaStale: false }),
}))
