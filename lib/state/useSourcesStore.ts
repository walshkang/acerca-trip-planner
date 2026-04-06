import { create } from 'zustand'

export type SourcePlaceState = {
  day_index?: number
  tags: string[]
  excluded: boolean
}

type SourcesState = {
  placeState: Record<string, SourcePlaceState>
  expandedSourceIds: string[]

  setDayIndex: (place_id: string, day_index: number | undefined) => void
  setTags: (place_id: string, tags: string[]) => void
  toggleExcluded: (place_id: string) => void
  toggleExpanded: (source_id: string) => void
  reset: () => void
}

function defaultPlaceState(): SourcePlaceState {
  return { tags: [], excluded: false }
}

function getOrCreate(
  placeState: Record<string, SourcePlaceState>,
  place_id: string
): SourcePlaceState {
  return placeState[place_id] ?? defaultPlaceState()
}

export const useSourcesStore = create<SourcesState>((set) => ({
  placeState: {},
  expandedSourceIds: [],

  setDayIndex: (place_id, day_index) =>
    set((s) => {
      const prev = getOrCreate(s.placeState, place_id)
      const next: SourcePlaceState = { ...prev }
      if (day_index === undefined) {
        delete next.day_index
      } else {
        next.day_index = day_index
      }
      return {
        placeState: { ...s.placeState, [place_id]: next },
      }
    }),

  setTags: (place_id, tags) =>
    set((s) => {
      const prev = getOrCreate(s.placeState, place_id)
      return {
        placeState: {
          ...s.placeState,
          [place_id]: { ...prev, tags },
        },
      }
    }),

  toggleExcluded: (place_id) =>
    set((s) => {
      const prev = getOrCreate(s.placeState, place_id)
      return {
        placeState: {
          ...s.placeState,
          [place_id]: { ...prev, excluded: !prev.excluded },
        },
      }
    }),

  toggleExpanded: (source_id) =>
    set((s) => {
      const ids = s.expandedSourceIds
      const has = ids.includes(source_id)
      return {
        expandedSourceIds: has
          ? ids.filter((id) => id !== source_id)
          : [...ids, source_id],
      }
    }),

  reset: () => set({ placeState: {}, expandedSourceIds: [] }),
}))

export function getPlaceStateSnapshot(
  placeState: Record<string, SourcePlaceState>,
  place_id: string
): SourcePlaceState {
  return getOrCreate(placeState, place_id)
}
