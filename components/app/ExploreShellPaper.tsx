'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MapPlace } from '@/components/map/MapView.types'
import MapShell, {
  type ActiveListItemState,
  type MapShellHandle,
} from '@/components/map/MapShell'
import Omnibox from '@/components/stitch/Omnibox'
import InspectorCard from '@/components/stitch/InspectorCard'
import ListDrawer from '@/components/stitch/ListDrawer'
import PlaceDrawer from '@/components/stitch/PlaceDrawer'
import PaperHeader from '@/components/paper/PaperHeader'
import PaperExplorePanel from '@/components/paper/PaperExplorePanel'
import PaperMapControls from '@/components/paper/PaperMapControls'
import OnboardingLayer from '@/components/app/OnboardingLayer'
import PlannerListSwitcher from '@/components/app/PlannerListSwitcher'
import type { MobileSnapState } from '@/lib/ui/mobileSnapState'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'
import { sortTags, uniqueStrings } from '@/lib/lists/filter-client'
import { derivePreviewMode } from '@/lib/ui/previewMode'
import { CATEGORY_ENUM_VALUES, type CategoryEnum } from '@/lib/types/enums'

const LAST_ACTIVE_LIST_KEY = 'acerca:lastActiveListId'
const LAST_ADDED_PLACE_KEY = 'acerca:lastAddedPlaceId'

type ListSummaryRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

/**
 * ExploreShellPaper — Paper-styled Explore mode (all viewports).
 *
 * Full-screen map + PaperHeader + list toolbar + PaperExplorePanel (right rail on md+, bottom sheet on small screens).
 */
export default function ExploreShellPaper() {
  // ── Map state ──
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [mapReady, setMapReady] = useState(false)
  const mapShellRef = useRef<MapShellHandle>(null)
  const [pendingFocusPlaceId, setPendingFocusPlaceId] = useState<string | null>(null)
  const [mapFallbackNotice, setMapFallbackNotice] = useState<string | null>(null)
  const { activeLayer, setLayer } = useMapLayerStore()

  // ── Panel state ──
  const [panelMode, setPanelMode] = useState<'lists' | 'details'>('lists')
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(null)
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)
  const [mobileExploreSnap, setMobileExploreSnap] = useState<MobileSnapState>('half')
  const [viewportH, setViewportH] = useState(667)

  const [listSummaries, setListSummaries] = useState<ListSummaryRow[]>([])
  const isNarrow = useMediaQuery('(max-width: 767px)')

  // ── Trip store ──
  const activeListId = useTripStore((s) => s.activeListId)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const activeListTypeFilters = useTripStore((s) => s.activeListTypeFilters)
  const activeListTagFilters = useTripStore((s) => s.activeListTagFilters)
  const setActiveListId = useTripStore((s) => s.setActiveListId)
  const setActiveListPlaceIds = useTripStore((s) => s.setActiveListPlaceIds)
  const setActiveListTypeFilters = useTripStore((s) => s.setActiveListTypeFilters)
  const setActiveListTagFilters = useTripStore((s) => s.setActiveListTagFilters)
  const setActiveListItems = useTripStore((s) => s.setActiveListItems)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)

  // ── Discovery store ──
  const ghostLocation = useDiscoveryStore((s) => s.ghostLocation)
  const previewCandidate = useDiscoveryStore((s) => s.previewCandidate)
  const previewSelectedResultId = useDiscoveryStore((s) => s.selectedResultId)
  const discoveryIsSubmitting = useDiscoveryStore((s) => s.isSubmitting)
  const discoveryError = useDiscoveryStore((s) => s.error)
  const discardPreview = useDiscoveryStore((s) => s.discardAndClear)
  const setSearchBias = useDiscoveryStore((s) => s.setSearchBias)
  const setListScopeId = useDiscoveryStore((s) => s.setListScopeId)

  // ── Nav ──
  const setMode = useNavStore((s) => s.setMode)

  // ── URL state ──
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedPlaceId = searchParams.get('place')
  const selectedListParam = searchParams.get('list')

  const setPlaceParam = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (params.get('place') === nextId) return
      if (nextId) params.set('place', nextId)
      else params.delete('place')
      const next = params.toString()
      router.push(next ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const setListParam = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (params.get('list') === nextId) return
      if (nextId) params.set('list', nextId)
      else params.delete('list')
      const next = params.toString()
      router.push(next ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const signInHref = useMemo(() => {
    const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return `/auth/sign-in?next=${encodeURIComponent(next)}`
  }, [pathname, searchParams])

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapShellRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
        })
      },
      (err) => {
        console.warn('Geolocation error:', err.message)
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }, [])

  useEffect(() => {
    const upd = () => setViewportH(window.innerHeight)
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/lists')
      .then((r) => r.json())
      .then((data: { lists?: ListSummaryRow[] }) => {
        if (!cancelled && data.lists) setListSummaries(data.lists)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [listItemsRefreshKey])

  // ── Derived state ──
  const activeListPlaceIdSet = useMemo(() => new Set(activeListPlaceIds), [activeListPlaceIds])
  const activeListItemByPlaceId = useMemo(() => {
    const m = new Map<string, ActiveListItemState>()
    for (const item of activeListItems) m.set(item.place_id, item)
    return m
  }, [activeListItems])
  const activeListItemOverride = useMemo(
    () => (selectedPlaceId ? activeListItemByPlaceId.get(selectedPlaceId) ?? null : null),
    [activeListItemByPlaceId, selectedPlaceId]
  )
  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )

  const previewMode = derivePreviewMode({
    previewSelectedResultId: previewSelectedResultId ?? null,
    isSubmitting: discoveryIsSubmitting,
    hasPreviewCandidate: Boolean(previewCandidate),
  })

  const isPanelOpen = Boolean(
    activeListId || selectedPlaceId || previewCandidate || previewSelectedResultId
  )

  const mobileBottomPad = useMemo(() => {
    switch (mobileExploreSnap) {
      case 'peek':
        return 120
      case 'half':
        return Math.round(viewportH * 0.5)
      case 'expanded':
        return Math.round(viewportH * 0.85)
      default:
        return 120
    }
  }, [mobileExploreSnap, viewportH])

  const fitBoundsPadding = useMemo(() => {
    // PaperHeader: top row (tabs + centered Omnibox) + list switcher row
    const baseTop = 120
    const base = { top: baseTop, bottom: 96, left: 24, right: 24 }
    if (isNarrow) {
      return { ...base, bottom: mobileBottomPad + 24, right: 24 }
    }
    if (isPanelOpen) return { ...base, right: 448 }
    return base
  }, [isNarrow, isPanelOpen, mobileBottomPad])

  const panelTitle = !activeListId
    ? 'Explore'
    : (listSummaries.find((l) => l.id === activeListId)?.name ?? 'Trip list')

  const exploreDistinctTags = useMemo(() => {
    const acc: string[] = []
    for (const item of activeListItems) {
      for (const t of item.tags ?? []) {
        if (typeof t === 'string') acc.push(t)
      }
    }
    return sortTags(uniqueStrings(acc))
  }, [activeListItems])

  const typeFilterChips = useMemo(
    () =>
      CATEGORY_ENUM_VALUES.map((cat) => ({
        id: cat,
        label: cat,
        active: activeListTypeFilters.includes(cat),
      })),
    [activeListTypeFilters]
  )

  const onTypeFilterChange = useCallback(
    (filterId: string) => {
      const cat = filterId as CategoryEnum
      if (!CATEGORY_ENUM_VALUES.includes(cat)) return
      const next = activeListTypeFilters.includes(cat)
        ? activeListTypeFilters.filter((c) => c !== cat)
        : [...activeListTypeFilters, cat]
      setActiveListTypeFilters(next)
    },
    [activeListTypeFilters, setActiveListTypeFilters]
  )

  const tagFilterChips = useMemo(
    () =>
      exploreDistinctTags.map((tag) => ({
        id: tag,
        label: tag.startsWith('#') ? tag : `#${tag}`,
        active: activeListTagFilters.includes(tag),
      })),
    [activeListTagFilters, exploreDistinctTags]
  )

  const onTagFilterChange = useCallback(
    (tagId: string) => {
      const next = activeListTagFilters.includes(tagId)
        ? activeListTagFilters.filter((t) => t !== tagId)
        : [...activeListTagFilters, tagId]
      setActiveListTagFilters(sortTags(uniqueStrings(next)))
    },
    [activeListTagFilters, setActiveListTagFilters]
  )

  const preferExpanded =
    panelMode === 'details' || previewMode !== 'none'

  const mapControlsBottomPx = isNarrow ? mobileBottomPad + 16 : undefined

  // ── Init: restore active list from URL or localStorage ──
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (typeof window === 'undefined') return
    if (selectedListParam) {
      setActiveListId(selectedListParam)
      return
    }
    const stored = window.localStorage.getItem(LAST_ACTIVE_LIST_KEY)
    if (stored) {
      setActiveListId(stored)
      if (selectedPlaceId) setFocusedListPlaceId(selectedPlaceId)
    }
  }, [selectedListParam, selectedPlaceId])

  useEffect(() => {
    if (!selectedListParam) return
    setActiveListId(selectedListParam)
  }, [selectedListParam])

  useEffect(() => {
    if (selectedPlaceId) setPanelMode('details')
  }, [selectedPlaceId])

  useEffect(() => {
    if (previewCandidate || previewSelectedResultId) setPanelMode('details')
  }, [previewCandidate, previewSelectedResultId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeListId) window.localStorage.setItem(LAST_ACTIVE_LIST_KEY, activeListId)
    else window.localStorage.removeItem(LAST_ACTIVE_LIST_KEY)
    setFocusedListPlaceId(null)
  }, [activeListId])

  useEffect(() => {
    setListScopeId(activeListId)
  }, [activeListId, setListScopeId])

  // ── Callbacks ──
  const refreshPlaces = useCallback(() => {
    void mapShellRef.current?.fetchPlaces()
  }, [])

  const bumpListTagRefresh = useCallback(() => setListTagRefreshKey((k) => k + 1), [])
  const bumpPlaceTagRefresh = useCallback(() => setPlaceTagRefreshKey((k) => k + 1), [])
  const handlePlaceCategoryUpdated = useCallback(
    (placeId: string, category: CategoryEnum) => {
      setPlaces((prev) => prev.map((p) => (p.id === placeId ? { ...p, category } : p)))
    },
    []
  )

  const handlePlaceClick = useCallback(
    (placeId: string) => {
      if (activeListId && activeListPlaceIdSet.has(placeId)) {
        setFocusedListPlaceId(placeId)
      }
      setPlaceParam(placeId)
      setPanelMode('details')
    },
    [activeListId, activeListPlaceIdSet, setPlaceParam]
  )

  const handleCanonicalSuggestionSelect = useCallback(
    (placeId: string) => {
      setPendingFocusPlaceId(placeId)
      handlePlaceClick(placeId)
    },
    [handlePlaceClick]
  )

  const closePlaceDetails = useCallback(() => {
    setPlaceParam(null)
    setFocusedListPlaceId(null)
    setPanelMode('lists')
  }, [setPlaceParam])

  const cancelPreview = useCallback(() => {
    discardPreview()
    setPlaceParam(null)
    setPanelMode('lists')
  }, [discardPreview, setPlaceParam])

  const onPlaceCommitted = useCallback(
    (placeId: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_ADDED_PLACE_KEY, placeId)
      }
      setPendingFocusPlaceId(placeId)
      refreshPlaces()
      setPlaceParam(placeId)
      setPanelMode('details')
    },
    [refreshPlaces, setPlaceParam]
  )

  // ── Panel content ──
  const panelContent = (() => {
    if (previewMode === 'loading') {
      return (
        <div className="p-4">
          <p className="text-sm font-medium text-paper-on-surface">Loading preview…</p>
          <p className="mt-1 text-xs text-paper-on-surface-variant">
            Fetching details so you can decide whether to approve.
          </p>
          <button type="button" onClick={cancelPreview} className="paper-button-primary mt-3 text-xs">
            Cancel
          </button>
        </div>
      )
    }

    if (previewMode === 'error') {
      return (
        <div className="p-4">
          <p className="text-sm font-medium text-paper-on-surface">Preview unavailable</p>
          <p className="mt-1 text-xs text-paper-on-surface-variant">
            {discoveryError || 'Could not load preview details.'}
          </p>
          <button type="button" onClick={cancelPreview} className="paper-button-primary mt-3 text-xs">
            Back
          </button>
        </div>
      )
    }

    if (previewMode === 'ready') {
      return (
        <div className="p-3">
          <InspectorCard tone="light" onCommitted={onPlaceCommitted} onClose={cancelPreview} />
        </div>
      )
    }

    if (panelMode === 'details' && selectedPlace) {
      return (
        <div className="p-3">
          <PlaceDrawer
            variant="embedded"
            open
            place={selectedPlace}
            activeListId={activeListId}
            activeListItemOverride={activeListItemOverride}
            tone="light"
            onClose={closePlaceDetails}
            tagsRefreshKey={placeTagRefreshKey}
            onTagsUpdated={bumpListTagRefresh}
            onCategoryUpdated={handlePlaceCategoryUpdated}
          />
        </div>
      )
    }

    return (
      <ListDrawer
        open
        variant="embedded"
        tone="light"
        hideListSelectionChips
        onClose={() => {}}
        activeListId={activeListId}
        onActiveListChange={(id) => {
          setActiveListId(id)
          setListParam(id)
        }}
        onPlaceIdsChange={setActiveListPlaceIds}
        onActiveTypeFiltersChange={setActiveListTypeFilters}
        onActiveTagFiltersChange={setActiveListTagFilters}
        syncedExploreTagFilters={activeListTagFilters}
        syncedExploreTypeFilters={activeListTypeFilters}
        onActiveListItemsChange={setActiveListItems}
        focusedPlaceId={focusedListPlaceId}
        onPlaceSelect={(placeId) => {
          setPendingFocusPlaceId(placeId)
          setPlaceParam(placeId)
          setFocusedListPlaceId(placeId)
          setPanelMode('details')
        }}
        tagsRefreshKey={listTagRefreshKey}
        itemsRefreshKey={listItemsRefreshKey}
        onTagsUpdated={bumpPlaceTagRefresh}
      />
    )
  })()

  return (
    <div className="relative h-screen w-screen bg-paper-surface">
      <MapShell
        ref={mapShellRef}
        signInHref={signInHref}
        fitBoundsPadding={fitBoundsPadding}
        selectedPlaceId={selectedPlaceId}
        setPlaceParam={setPlaceParam}
        activeListId={activeListId}
        activeListPlaceIds={activeListPlaceIds}
        activeListItems={activeListItems}
        activeListTypeFilters={activeListTypeFilters}
        focusedListPlaceId={focusedListPlaceId}
        setFocusedListPlaceId={setFocusedListPlaceId}
        setDrawerOpen={() => {}}
        setPanelMode={setPanelMode}
        pendingFocusPlaceId={pendingFocusPlaceId}
        setPendingFocusPlaceId={setPendingFocusPlaceId}
        previewSelectedResultId={previewSelectedResultId}
        ghostLocation={ghostLocation}
        discardPreview={discardPreview}
        mapStyleMode="light"
        showTransit={activeLayer === 'transit'}
        setMapFallbackNotice={setMapFallbackNotice}
        setSearchBias={setSearchBias}
        onReadyChange={setMapReady}
        onPlacesChange={setPlaces}
      />

      {mapReady && (
        <>
          <PaperHeader
            activeTab="map"
            onTabChange={(tab) => {
              if (tab === 'itinerary') setMode('plan')
            }}
            clearRightRail={!isNarrow}
            activeLayer={activeLayer}
            onLayerChange={setLayer}
            searchSlot={
              <div data-onboarding="omnibox">
                <Omnibox
                  tone="light"
                  placeholder="Search"
                  inputWidth="fluid"
                  onCanonicalPlaceSelect={handleCanonicalSuggestionSelect}
                />
              </div>
            }
            bottomSlot={
              <PlannerListSwitcher
                labelPrefix="Trip:"
                listsCaption="Your lists"
                onListSelect={(id) => setListParam(id)}
              />
            }
          />

          {mapFallbackNotice && (
            <div className="absolute left-4 top-28 z-[60] max-w-[320px] rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface p-3 max-md:top-40">
              <p className="text-[11px] text-paper-on-surface-variant">{mapFallbackNotice}</p>
              <button
                type="button"
                onClick={() => setMapFallbackNotice(null)}
                className="mt-2 text-[11px] font-bold text-paper-primary"
              >
                Dismiss
              </button>
            </div>
          )}

          <div data-onboarding="filter-panel">
            <PaperExplorePanel
              locationName={panelTitle}
              subtitle={null}
              activeListId={activeListId}
              filters={activeListId ? typeFilterChips : undefined}
              onFilterChange={activeListId ? onTypeFilterChange : undefined}
              tags={activeListId && tagFilterChips.length > 0 ? tagFilterChips : undefined}
              onTagChange={activeListId ? onTagFilterChange : undefined}
              preferExpanded={preferExpanded}
              onMobileSnapChange={setMobileExploreSnap}
            >
              {panelContent}
            </PaperExplorePanel>
          </div>

          <PaperMapControls
            onLocate={handleLocate}
            style={mapControlsBottomPx != null ? { bottom: mapControlsBottomPx } : undefined}
          />

          <OnboardingLayer />
        </>
      )}
    </div>
  )
}
