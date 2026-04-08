'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { MapPlace } from '@/components/map/MapView.types'
import MapShell, { type MapShellHandle } from '@/components/map/MapShell'
import PaperHeader from '@/components/paper/PaperHeader'
import PlaceDrawer from '@/components/stitch/PlaceDrawer'
import SourcesPanel from '@/components/stitch/SourcesPanel'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import type { UserSocialSourceRow } from '@/lib/social/user-sources-contract'
import { useResearchWorkspaceStore } from '@/lib/state/useResearchWorkspaceStore'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * SourcesShellPaper — Paper-styled Sources journey mode.
 */
export default function SourcesShellPaper() {
  const setMode = useNavStore((s) => s.setMode)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const mapShellRef = useRef<MapShellHandle | null>(null)
  const [selectedSource, setSelectedSource] = useState<UserSocialSourceRow | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [mapPinnedPlaceId, setMapPinnedPlaceId] = useState<string | null>(null)
  const [researchListId, setResearchListId] = useState<string | null>(null)
  const [researchMapPlaces, setResearchMapPlaces] = useState<MapPlace[]>([])
  const [searchThisAreaTick, setSearchThisAreaTick] = useState(0)

  const setViewportBounds = useResearchWorkspaceStore((s) => s.setViewportBounds)
  const searchAreaStale = useResearchWorkspaceStore((s) => s.searchAreaStale)

  const signInHref = useMemo(() => {
    const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return `/auth/sign-in?next=${encodeURIComponent(next)}`
  }, [pathname, searchParams])

  const sourceMapPlaces = useMemo<MapPlace[]>(
    () =>
      (selectedSource?.places ?? [])
        .filter(
          (place) =>
            place.lat != null &&
            place.lng != null &&
            CATEGORY_ENUM_VALUES.includes(place.category as CategoryEnum)
        )
        .map((place) => ({
          id: place.place_id,
          name: place.place_name,
          category: place.category as CategoryEnum,
          lat: place.lat!,
          lng: place.lng!,
          mentionCount: 1,
        })),
    [selectedSource]
  )

  const displayMapPlaces = researchListId ? researchMapPlaces : sourceMapPlaces

  const onMapBoundsChange = useCallback(
    (bounds: { west: number; south: number; east: number; north: number }) => {
      setViewportBounds(bounds)
    },
    [setViewportBounds]
  )

  const focusedPlace = useMemo(() => {
    if (!focusedPlaceId) return null
    const fromMap = displayMapPlaces.find((place) => place.id === focusedPlaceId)
    if (fromMap) return fromMap
    return null
  }, [displayMapPlaces, focusedPlaceId])

  useEffect(() => {
    if (!focusedPlaceId) return
    if (displayMapPlaces.some((place) => place.id === focusedPlaceId)) return
    setFocusedPlaceId(null)
  }, [displayMapPlaces, focusedPlaceId])

  useEffect(() => {
    if (focusedPlaceId) setMapPinnedPlaceId(null)
  }, [focusedPlaceId])

  useEffect(() => {
    if (!mapPinnedPlaceId) return
    const place = sourceMapPlaces.find((p) => p.id === mapPinnedPlaceId)
    if (!place) return
    mapShellRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 15 })
  }, [mapPinnedPlaceId, sourceMapPlaces])

  return (
    <div className="relative flex h-screen w-full flex-col bg-paper-surface-warm">
      <PaperHeader
        activeTab="sources"
        onTabChange={(tab) => {
          if (tab === 'map') setMode('explore')
          else if (tab === 'itinerary') setMode('plan')
        }}
        clearRightRail={false}
      />
      <div
        data-testid="sources-shell-body"
        className="flex min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-[max(4.75rem,calc(env(safe-area-inset-top,0px)+3.75rem))] sm:px-6 md:gap-3"
      >
        <div className={`${isMobile ? 'w-full' : 'w-full md:w-[380px] md:shrink-0'} min-h-0`}>
          <div className="h-full overflow-hidden rounded-[4px] border border-paper-tertiary-fixed">
            <SourcesPanel
              onSelectedSourceChange={setSelectedSource}
              onMoreDetails={setFocusedPlaceId}
              onCardSelect={(placeId) => {
                setMapPinnedPlaceId((prev) => (prev === placeId ? null : placeId))
              }}
              researchListId={researchListId}
              onResearchListIdChange={setResearchListId}
              onResearchMapPlacesChange={setResearchMapPlaces}
              searchThisAreaTick={searchThisAreaTick}
            />
          </div>
        </div>
        {!isMobile ? (
          <div className="relative hidden min-h-0 min-w-0 flex-1 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed md:block">
            {researchListId ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                <button
                  type="button"
                  data-testid="research-search-this-area"
                  disabled={!searchAreaStale}
                  onClick={() => setSearchThisAreaTick((n) => n + 1)}
                  className="pointer-events-auto rounded-full border border-paper-tertiary-fixed bg-paper-surface-container/95 px-4 py-2 text-xs font-medium text-paper-on-surface shadow-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Search this area
                </button>
              </div>
            ) : null}
            <MapShell
              ref={mapShellRef}
              signInHref={signInHref}
              fitBoundsPadding={{ top: 100, bottom: 40, left: 40, right: 40 }}
              selectedPlaceId={mapPinnedPlaceId ?? focusedPlaceId}
              setPlaceParam={setFocusedPlaceId}
              activeListId={null}
              activeListPlaceIds={[]}
              activeListItems={[]}
              activeListTypeFilters={[]}
              focusedListPlaceId={focusedPlaceId}
              setFocusedListPlaceId={setFocusedPlaceId}
              setDrawerOpen={() => {}}
              setPanelMode={() => {}}
              pendingFocusPlaceId={null}
              setPendingFocusPlaceId={() => {}}
              previewSelectedResultId={null}
              ghostLocation={null}
              discardPreview={() => {}}
              mapStyleMode="light"
              showTransit={false}
              setMapFallbackNotice={() => {}}
              setSearchBias={() => {}}
              onMapBoundsChange={onMapBoundsChange}
              socialPlaces={displayMapPlaces}
              className="absolute inset-0"
            />
          </div>
        ) : null}
      </div>

      {focusedPlace ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl">
            <PlaceDrawer
              open
              place={focusedPlace}
              activeListId={null}
              tone="light"
              onClose={() => setFocusedPlaceId(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
