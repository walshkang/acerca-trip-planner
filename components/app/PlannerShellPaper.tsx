'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { downloadListCsv } from '@/lib/export/download-list-csv'
import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import CalendarPlanner from '@/components/planner/CalendarPlanner'
import MapInset from '@/components/map/MapInset.dynamic'
import type { MapPlace } from '@/components/map/MapView.types'
import type { CategoryEnum } from '@/lib/types/enums'
import { getSupabase } from '@/lib/supabase/client'
import PaperHeader from '@/components/paper/PaperHeader'
import PlannerListSwitcher from '@/components/app/PlannerListSwitcher'

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
 * Stripped chrome: no sidebar, no footer. PaperHeader + list switcher + planner.
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const setMode = useNavStore((s) => s.setMode)
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const plannerSelectedDay = useTripStore((s) => s.plannerSelectedDay)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)

  const [mapPlaces, setMapPlaces] = useState<MapPlace[]>([])
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportCsvError, setExportCsvError] = useState<string | null>(null)
  /** px: measured header bottom + gap; null until client layout */
  const [planContentPaddingTop, setPlanContentPaddingTop] = useState<number | null>(null)

  const onPaperHeaderViewportBottom = useCallback((bottomPx: number) => {
    setPlanContentPaddingTop(Math.ceil(bottomPx) + 12)
  }, [])

  // Fetch map places
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

  const handleExportCsv = useCallback(async () => {
    setExportCsvError(null)
    setExportingCsv(true)
    try {
      const result = await downloadListCsv(activeListId)
      if (!result.ok) {
        if (result.kind === 'unauthorized') {
          const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
          router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`)
          return
        }
        setExportCsvError(result.message)
      }
    } finally {
      setExportingCsv(false)
    }
  }, [activeListId, pathname, router, searchParams])

  return (
    <div
      className="flex h-screen flex-col bg-paper-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Header: tabs + list switcher row */}
      <PaperHeader
        activeTab="itinerary"
        onTabChange={(tab) => {
          if (tab === 'map') setMode('explore')
        }}
        onViewportBottomChange={onPaperHeaderViewportBottom}
        bottomSlot={
          <div className="flex w-full flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <PlannerListSwitcher listsCaption="Your lists" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void handleExportCsv()}
                disabled={exportingCsv}
                className="rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container-low px-3 py-1.5 text-xs font-medium text-paper-on-surface transition hover:bg-paper-tertiary-fixed disabled:opacity-50"
              >
                {exportingCsv ? 'Exporting…' : 'Export CSV'}
              </button>
              {exportCsvError ? (
                <p
                  className="max-w-[240px] text-right text-[11px] text-red-600 dark:text-red-300"
                  role="alert"
                >
                  {exportCsvError}
                </p>
              ) : null}
            </div>
          </div>
        }
      />

      {/* Map | planner: strip below xl, left column at xl+ */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-[max(8.5rem,calc(env(safe-area-inset-top,0px)+7.5rem))] sm:gap-4 sm:px-6 xl:flex-row"
        style={
          planContentPaddingTop != null
            ? { paddingTop: planContentPaddingTop }
            : undefined
        }
      >
        <div className="h-[min(200px,28vh)] w-full shrink-0 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed min-[480px]:h-[180px] xl:h-auto xl:w-[350px] xl:min-h-0 xl:shrink-0">
          <MapInset
            className="h-full w-full"
            places={mapPlaces}
            activeListItems={activeListItems}
            selectedDay={plannerSelectedDay}
            onPinClick={onPinClick}
          />
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <CalendarPlanner listId={activeListId} onPlanMutated={bumpListItemsRefresh} />
        </div>
      </div>
    </div>
  )
}
