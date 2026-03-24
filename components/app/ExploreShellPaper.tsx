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
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import { derivePreviewMode } from '@/lib/ui/previewMode'

const LAST_ACTIVE_LIST_KEY = 'acerca:lastActiveListId'
const LAST_ADDED_PLACE_KEY = 'acerca:lastAddedPlaceId'

/**
 * ExploreShellPaper — Paper-styled Explore mode (desktop only).
 *
 * Full-screen Mapbox map + PaperHeader + right-docked PaperExplorePanel (400px).
 * Reads the same Zustand stores as ExploreShell but with simpler UI state.
 */
export default function ExploreShellPaper() {
  // ── Map state ──
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [mapReady, setMapReady] = useState(false)
  const mapShellRef = useRef<MapShellHandle>(null)
  const [pendingFocusPlaceId, setPendingFocusPlaceId] = useState<string | null>(null)
  const [mapFallbackNotice, setMapFallbackNotice] = useState<string | null>(null)

  // ── Panel state ──
  const [panelMode, setPanelMode] = useState<'lists' | 'details'>('lists')
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(null)
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)

  // ── Trip store ──
  const activeListId = useTripStore((s) => s.activeListId)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const activeListTypeFilters = useTripStore((s) => s.activeListTypeFilters)
  const setActiveListId = useTripStore((s) => s.setActiveListId)
  const setActiveListPlaceIds = useTripStore((s) => s.setActiveListPlaceIds)
  const setActiveListTypeFilters = useTripStore((s) => s.setActiveListTypeFilters)
  const setActiveListItems = useTripStore((s) => s.setActiveListItems)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)

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

  const fitBoundsPadding = useMemo(() => {
    const base = { top: 80, bottom: 80, left: 80, right: 80 }
    if (isPanelOpen) return { ...base, right: 448 } // 400px panel + 48px margin
    return base
  }, [isPanelOpen])

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
    // Preview loading
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

    // Preview error
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

    // Preview ready (inspector card)
    if (previewMode === 'ready') {
      return (
        <div className="p-3">
          <InspectorCard tone="light" onCommitted={onPlaceCommitted} onClose={cancelPreview} />
        </div>
      )
    }

    // Place details
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
          />
        </div>
      )
    }

    // Default: list view
    return (
      <ListDrawer
        open
        variant="embedded"
        tone="light"
        onClose={() => {}}
        activeListId={activeListId}
        onActiveListChange={(id) => {
          setActiveListId(id)
          setListParam(id)
        }}
        onPlaceIdsChange={setActiveListPlaceIds}
        onActiveTypeFiltersChange={setActiveListTypeFilters}
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
      {/* Full-screen map */}
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
        showTransit={false}
        showTransitStations={false}
        showNeighborhoodBoundaries={false}
        setMapFallbackNotice={setMapFallbackNotice}
        setSearchBias={setSearchBias}
        onReadyChange={setMapReady}
        onPlacesChange={setPlaces}
      />

      {mapReady && (
        <>
          {/* Header */}
          <PaperHeader
            activeTab="map"
            onTabChange={(tab) => {
              if (tab === 'itinerary') setMode('plan')
            }}
            searchSlot={
              <Omnibox tone="light" onCanonicalPlaceSelect={handleCanonicalSuggestionSelect} />
            }
          />

          {/* Fallback notice */}
          {mapFallbackNotice && (
            <div className="absolute left-4 top-24 z-[60] max-w-[320px] rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface p-3">
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

          {/* Right context panel */}
          <PaperExplorePanel
            locationName={activeListId ? 'Trip List' : 'Explore'}
            filters={undefined}
            footerAction={
              <button
                type="button"
                className="paper-button-primary w-full font-headline font-black tracking-widest"
              >
                Plan Route from Current Location
              </button>
            }
          >
            {panelContent}
          </PaperExplorePanel>

          {/* Map controls — zoom wiring deferred until MapShellHandle exposes getMap() */}
          <PaperMapControls />
        </>
      )}
    </div>
  )
}
