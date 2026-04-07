'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { MapPlace } from '@/components/map/MapView.types'
import MapShell from '@/components/map/MapShell'
import PaperHeader from '@/components/paper/PaperHeader'
import PlaceDrawer from '@/components/stitch/PlaceDrawer'
import SourcesPanel from '@/components/stitch/SourcesPanel'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import type { UserSocialSourceRow } from '@/lib/social/user-sources-contract'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'
import { useNavStore } from '@/lib/state/useNavStore'
import { hydrateSocialStore, useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'

/**
 * SourcesShellPaper — Paper-styled Sources journey mode.
 */
export default function SourcesShellPaper() {
  const setMode = useNavStore((s) => s.setMode)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const socialPlaces = useSocialDiscoveryStore((s) => s.socialPlaces)
  const fetchSocialPlaces = useSocialDiscoveryStore((s) => s.fetchPlaces)

  const [selectedSource, setSelectedSource] = useState<UserSocialSourceRow | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)

  useEffect(() => {
    hydrateSocialStore()
    void fetchSocialPlaces()
  }, [fetchSocialPlaces])

  const signInHref = useMemo(() => {
    const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return `/auth/sign-in?next=${encodeURIComponent(next)}`
  }, [pathname, searchParams])

  const selectedSourcePlaceIds = useMemo(
    () => new Set(selectedSource?.places.map((place) => place.place_id) ?? []),
    [selectedSource]
  )

  const sourceMapPlaces = useMemo<MapPlace[]>(
    () =>
      socialPlaces
        .filter(
          (place) =>
            selectedSourcePlaceIds.has(place.place_id) &&
            CATEGORY_ENUM_VALUES.includes(place.category as CategoryEnum)
        )
        .map((place) => ({
          id: place.place_id,
          name: place.name,
          category: place.category as CategoryEnum,
          lat: place.lat,
          lng: place.lng,
          mentionCount: place.mention_count,
        })),
    [selectedSourcePlaceIds, socialPlaces]
  )

  const focusedPlace = useMemo(
    () => sourceMapPlaces.find((place) => place.id === focusedPlaceId) ?? null,
    [focusedPlaceId, sourceMapPlaces]
  )

  useEffect(() => {
    if (!focusedPlaceId) return
    if (sourceMapPlaces.some((place) => place.id === focusedPlaceId)) return
    setFocusedPlaceId(null)
  }, [focusedPlaceId, sourceMapPlaces])

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
            />
          </div>
        </div>
        {!isMobile ? (
          <div className="relative hidden min-h-0 min-w-0 flex-1 overflow-hidden rounded-[4px] border border-paper-tertiary-fixed md:block">
            <MapShell
              signInHref={signInHref}
              fitBoundsPadding={{ top: 100, bottom: 40, left: 40, right: 40 }}
              selectedPlaceId={focusedPlaceId}
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
              socialPlaces={sourceMapPlaces}
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
