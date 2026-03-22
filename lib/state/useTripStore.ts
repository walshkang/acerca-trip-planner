import { create } from 'zustand'
import type { CategoryEnum } from '@/lib/types/enums'

export type TripListItem = {
  id: string
  list_id: string
  place_id: string
  tags: string[]
  scheduled_date: string | null
  scheduled_start_time: string | null
  completed_at: string | null
  day_index: number | null
}

type TripState = {
  /** Currently selected list UUID, or null */
  activeListId: string | null
  /** Place IDs belonging to the active list */
  activeListPlaceIds: string[]
  /** Scheduling state for items in the active list */
  activeListItems: TripListItem[]
  /** Active category type filters */
  activeListTypeFilters: CategoryEnum[]
  /** Refresh key for list items — bump to trigger refetch in consumers */
  listItemsRefreshKey: number

  setActiveListId: (id: string | null) => void
  setActiveListPlaceIds: (ids: string[]) => void
  setActiveListItems: (items: TripListItem[]) => void
  setActiveListTypeFilters: (filters: CategoryEnum[]) => void
  bumpListItemsRefresh: () => void
  /** Clear list-scoped state (place IDs, items, filters) */
  clearListState: () => void
}

export const useTripStore = create<TripState>((set) => ({
  activeListId: null,
  activeListPlaceIds: [],
  activeListItems: [],
  activeListTypeFilters: [],
  listItemsRefreshKey: 0,

  setActiveListId: (id) => {
    set({
      activeListId: id,
      activeListPlaceIds: [],
      activeListItems: [],
      activeListTypeFilters: [],
    })
  },

  setActiveListPlaceIds: (ids) =>
    set((state) => {
      // Shallow equality check to avoid unnecessary re-renders
      const prev = state.activeListPlaceIds
      if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) {
        return state
      }
      return { activeListPlaceIds: ids }
    }),

  setActiveListItems: (items) => set({ activeListItems: items }),
  setActiveListTypeFilters: (filters) =>
    set({ activeListTypeFilters: filters }),
  bumpListItemsRefresh: () =>
    set((state) => ({ listItemsRefreshKey: state.listItemsRefreshKey + 1 })),
  clearListState: () =>
    set({
      activeListPlaceIds: [],
      activeListItems: [],
      activeListTypeFilters: [],
    }),
}))
