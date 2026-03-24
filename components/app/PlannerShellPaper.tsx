'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import ListPlanner from '@/components/stitch/ListPlanner'
import MapInset from '@/components/map/MapInset.dynamic'
import type { MapPlace } from '@/components/map/MapView.types'
import type { CategoryEnum } from '@/lib/types/enums'
import { supabase } from '@/lib/supabase/client'
import PaperHeader from '@/components/paper/PaperHeader'
import PaperSidebar from '@/components/paper/PaperSidebar'
import PaperFooterBar from '@/components/paper/PaperFooterBar'

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  lat: number | null
  lng: number | null
}

/**
 * PlannerShellPaper — Paper-styled Plan mode (desktop only).
 *
 * Left sidebar + PaperHeader + two-column planner layout.
 * Reuses ListPlanner for all scheduling logic.
 */
export default function PlannerShellPaper() {
  const activeListId = useTripStore((s) => s.activeListId)
  const setMode = useNavStore((s) => s.setMode)

  if (!activeListId) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-paper-surface">
        <div className="max-w-md space-y-4 px-6 text-center">
          <h1 className="font-headline text-2xl font-extrabold tracking-tighter text-paper-on-surface">
            Planner
          </h1>
          <p className="text-sm text-paper-on-surface-variant">
            Select a trip in Explore mode first, then switch to Plan.
          </p>
          <button
            type="button"
            onClick={() => setMode('explore')}
            className="rounded-[4px] border border-paper-tertiary-fixed px-4 py-2 text-sm font-medium text-paper-on-surface transition hover:bg-paper-surface-container"
          >
            Back to Explore
          </button>
        </div>
      </div>
    )
  }

  return <PlannerShellPaperWithList activeListId={activeListId} />
}

function PlannerShellPaperWithList({ activeListId }: { activeListId: string }) {
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const plannerSelectedDay = useTripStore((s) => s.plannerSelectedDay)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)
  const setMode = useNavStore((s) => s.setMode)

  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([])
  const [listName, setListName] = useState<string>('')

  // Fetch list name for sidebar title
  useEffect(() => {
    let cancelled = false
    void supabase
      .from('lists')
      .select('name')
      .eq('id', activeListId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.name) setListName(data.name)
      })
    return () => { cancelled = true }
  }, [activeListId])

  // Fetch map places
  useEffect(() => {
    const placeIds = activeListPlaceIds
    if (!placeIds.length) {
      setMapPlaces([])
      return
    }
    let cancelled = false
    void supabase
      .from('places_view')
      .select('id, name, category, lat, lng')
      .in('id', placeIds)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
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
    return () => { cancelled = true }
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

  const sidebarNavItems = [
    {
      id: 'destinations',
      label: 'Destinations',
      icon: 'explore',
      active: true,
    },
    {
      id: 'explore',
      label: 'Explore Map',
      icon: 'map',
      onClick: () => setMode('explore'),
    },
  ]

  return (
    <div className="flex h-screen bg-paper-surface">
      {/* Left sidebar */}
      <PaperSidebar
        projectTitle={listName || 'Trip'}
        subtitle="Planning"
        navItems={sidebarNavItems}
      />

      {/* Main content */}
      <div className="ml-64 flex flex-1 flex-col min-w-0">
        {/* Header */}
        <PaperHeader
          activeTab="itinerary"
          onTabChange={(tab) => {
            if (tab === 'map') setMode('explore')
          }}
        />

        {/* Content area below header */}
        <div className="flex flex-1 min-h-0 flex-col pt-24">
          {/* Mini map inset */}
          <div className="mx-6 h-[180px] shrink-0 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed">
            <MapInset
              className="h-full w-full"
              places={mapPlaces}
              activeListItems={activeListItems}
              selectedDay={plannerSelectedDay}
              onPinClick={onPinClick}
            />
          </div>

          {/* Planner content */}
          <div className="flex-1 min-h-0">
            <ListPlanner
              listId={activeListId}
              tone="light"
              layout="split"
              onPlanMutated={bumpListItemsRefresh}
            />
          </div>

          {/* Footer */}
          <PaperFooterBar />
        </div>
      </div>
    </div>
  )
}
