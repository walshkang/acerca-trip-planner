import { beforeEach, describe, expect, it } from 'vitest'
import { useTripStore } from '@/lib/state/useTripStore'

function resetTripStore() {
  useTripStore.setState({
    activeListId: null,
    activeListPlaceIds: [],
    activeListItems: [],
    activeListTypeFilters: [],
    activeListTagFilters: [],
    listItemsRefreshKey: 0,
    plannerSelectedDay: null,
    focusedPlannerPlaceId: null,
    lastFetchedAt: null,
  })
}

describe('useTripStore lastFetchedAt', () => {
  beforeEach(() => {
    resetTripStore()
  })

  it('updates via setLastFetchedAt', () => {
    const t = 1_700_000_000_000
    useTripStore.getState().setLastFetchedAt(t)
    expect(useTripStore.getState().lastFetchedAt).toBe(t)
  })

  it('clears lastFetchedAt when setActiveListId runs', () => {
    useTripStore.getState().setLastFetchedAt(Date.now())
    useTripStore.getState().setActiveListId('550e8400-e29b-41d4-a716-446655440000')
    expect(useTripStore.getState().lastFetchedAt).toBeNull()
  })

  it('clears lastFetchedAt on clearListState', () => {
    useTripStore.getState().setLastFetchedAt(Date.now())
    useTripStore.getState().clearListState()
    expect(useTripStore.getState().lastFetchedAt).toBeNull()
  })
})
