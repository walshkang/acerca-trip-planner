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

function tripListItemsShallowEqual(a: TripListItem[], b: TripListItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (
      x.id !== y.id ||
      x.list_id !== y.list_id ||
      x.place_id !== y.place_id ||
      x.scheduled_date !== y.scheduled_date ||
      x.scheduled_start_time !== y.scheduled_start_time ||
      x.completed_at !== y.completed_at ||
      x.day_index !== y.day_index ||
      x.tags.length !== y.tags.length ||
      !x.tags.every((t, j) => t === y.tags[j])
    ) {
      return false
    }
  }
  return true
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
  /** Active tag filters (Paper Explore panel / list query) */
  activeListTagFilters: string[]
  /** Refresh key for list items — bump to trigger refetch in consumers */
  listItemsRefreshKey: number
  /** Day selected in ListPlanner day grid (ISO date), for MapInset sync */
  plannerSelectedDay: string | null
  /** MapInset pin click → scroll highlight target in day detail (place id) */
  focusedPlannerPlaceId: string | null
  /** Epoch ms when list items were last successfully fetched (planner freshness) */
  lastFetchedAt: number | null

  setActiveListId: (id: string | null) => void
  setActiveListPlaceIds: (ids: string[]) => void
  setActiveListItems: (items: TripListItem[]) => void
  setActiveListTypeFilters: (filters: CategoryEnum[]) => void
  setActiveListTagFilters: (tags: string[]) => void
  bumpListItemsRefresh: () => void
  setPlannerSelectedDay: (day: string | null) => void
  setFocusedPlannerPlaceId: (id: string | null) => void
  setLastFetchedAt: (t: number) => void
  /** Clear list-scoped state (place IDs, items, filters) */
  clearListState: () => void
}

export const useTripStore = create<TripState>((set) => ({
  activeListId: null,
  activeListPlaceIds: [],
  activeListItems: [],
  activeListTypeFilters: [],
  activeListTagFilters: [],
  listItemsRefreshKey: 0,
  plannerSelectedDay: null,
  focusedPlannerPlaceId: null,
  lastFetchedAt: null,

  setActiveListId: (id) => {
    set({
      activeListId: id,
      activeListPlaceIds: [],
      activeListItems: [],
      activeListTypeFilters: [],
      activeListTagFilters: [],
      plannerSelectedDay: null,
      focusedPlannerPlaceId: null,
      lastFetchedAt: null,
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

  setActiveListItems: (items) =>
    set((state) => {
      if (tripListItemsShallowEqual(state.activeListItems, items)) return state
      return { activeListItems: items }
    }),
  setActiveListTypeFilters: (filters) =>
    set({ activeListTypeFilters: filters }),
  setActiveListTagFilters: (tags) =>
    set((state) => {
      const prev = state.activeListTagFilters
      if (prev.length === tags.length && prev.every((t, i) => t === tags[i])) {
        return state
      }
      return { activeListTagFilters: tags }
    }),
  bumpListItemsRefresh: () =>
    set((state) => ({ listItemsRefreshKey: state.listItemsRefreshKey + 1 })),
  setPlannerSelectedDay: (day) =>
    set((state) => {
      if (state.plannerSelectedDay === day) return state
      return { plannerSelectedDay: day }
    }),
  setFocusedPlannerPlaceId: (id) => set({ focusedPlannerPlaceId: id }),
  setLastFetchedAt: (t) => set({ lastFetchedAt: t }),
  clearListState: () =>
    set({
      activeListPlaceIds: [],
      activeListItems: [],
      activeListTypeFilters: [],
      activeListTagFilters: [],
      focusedPlannerPlaceId: null,
      lastFetchedAt: null,
    }),
}))
