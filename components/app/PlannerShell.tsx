'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import ListPlanner from '@/components/stitch/ListPlanner'
import PlannerListSwitcher from '@/components/app/PlannerListSwitcher'
import MapInset from '@/components/map/MapInset.dynamic'
import type { MapPlace } from '@/components/map/MapView.types'
import type { CategoryEnum } from '@/lib/types/enums'
import { getSupabase } from '@/lib/supabase/client'

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  lat: number | null
  lng: number | null
}

/**
 * PlannerShell — the Plan journey shell.
 *
 * Desktop (≥1024px): MapInset minimap strip + split ListPlanner.
 * Mobile (<1024px): single scrollable column with inline day detail (no inset).
 */
export default function PlannerShell() {
  const activeListId = useTripStore((s) => s.activeListId)
  const setMode = useNavStore((s) => s.setMode)

  if (!activeListId) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md space-y-4 px-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Planner
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select a trip in Explore mode first, then switch to Plan.
          </p>
          <button
            type="button"
            onClick={() => setMode('explore')}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back to Explore
          </button>
        </div>
      </div>
    )
  }

  return <PlannerShellWithList activeListId={activeListId} />
}

function PlannerShellWithList({ activeListId }: { activeListId: string }) {
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const plannerSelectedDay = useTripStore((s) => s.plannerSelectedDay)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([])

  useEffect(() => {
    const placeIds = activeListPlaceIds
    if (!placeIds.length) {
      setMapPlaces([])
      return
    }

    let cancelled = false
    void getSupabase()
      .from('places_view')
      .select('id, name, category, lat, lng')
      .in('id', placeIds)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[PlannerShell] places_view fetch failed:', error)
          setMapPlaces([])
          return
        }
        const next: MapPlace[] = ((data ?? []) as PlacesRow[])
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            lat: p.lat as number,
            lng: p.lng as number,
          }))
        setMapPlaces(next)
      })

    return () => {
      cancelled = true
    }
  }, [activeListId, activeListPlaceIds, listItemsRefreshKey])

  const onPinClick = useCallback((placeId: string) => {
    const state = useTripStore.getState()
    const item = state.activeListItems.find((i) => i.place_id === placeId)
    if (!item?.scheduled_date) return
    if (item.scheduled_date !== state.plannerSelectedDay) {
      state.setPlannerSelectedDay(item.scheduled_date)
    }
    state.setFocusedPlannerPlaceId(placeId)
  }, [])

  if (isDesktop) {
    return (
      <div
        className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-900"
        data-map-tone="light"
      >
        <div className="flex items-center px-3 pt-3 pb-2">
          <PlannerListSwitcher />
        </div>
        <div className="h-[240px] shrink-0 overflow-hidden rounded-lg px-3">
          <MapInset
            className="h-full w-full"
            places={mapPlaces}
            activeListItems={activeListItems}
            selectedDay={plannerSelectedDay}
            onPinClick={onPinClick}
          />
        </div>
        <div className="flex-1 min-h-0">
          <ListPlanner
            listId={activeListId}
            tone="light"
            layout="split"
            onPlanMutated={bumpListItemsRefresh}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-900"
      data-map-tone="light"
    >
      <div className="flex items-center px-3 pt-3 pb-2">
        <PlannerListSwitcher />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-4">
          <ListPlanner
            listId={activeListId}
            tone="light"
            layout="column"
            onPlanMutated={bumpListItemsRefresh}
          />
        </div>
      </div>
    </div>
  )
}
