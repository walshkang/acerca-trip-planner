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
import ContextPanel from '@/components/ui/ContextPanel'
import ToolsSheet from '@/components/ui/ToolsSheet'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { useTripStore } from '@/lib/state/useTripStore'
import { derivePreviewMode } from '@/lib/ui/previewMode'

const PANEL_STORAGE_KEY = 'acerca:panelWidth'
const PANEL_SNAP_VALUES = [360, 520, 760]

export default function ExploreShell() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [mapReady, setMapReady] = useState(false)
  const mapShellRef = useRef<MapShellHandle>(null)
  const [pendingFocusPlaceId, setPendingFocusPlaceId] = useState<string | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [desktopPanelWidth, setDesktopPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 760
    const stored = localStorage.getItem(PANEL_STORAGE_KEY)
    const parsed = stored ? Number(stored) : NaN
    return PANEL_SNAP_VALUES.includes(parsed) ? parsed : 760
  })
  const [mobileSheetSnap, setMobileSheetSnap] = useState<
    'peek' | 'half' | 'expanded'
  >('half')
  const [panelMode, setPanelMode] = useState<'lists' | 'details'>('lists')
  const [toolsOpen, setToolsOpen] = useState(false)
  const activeListId = useTripStore((s) => s.activeListId)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const activeListTypeFilters = useTripStore((s) => s.activeListTypeFilters)
  const setActiveListId = useTripStore((s) => s.setActiveListId)
  const setActiveListPlaceIds = useTripStore((s) => s.setActiveListPlaceIds)
  const setActiveListTypeFilters = useTripStore(
    (s) => s.setActiveListTypeFilters
  )
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(
    null
  )
  const [showTransit, setShowTransit] = useState(false)
  const [showTransitStations, setShowTransitStations] = useState(false)
  const [showNeighborhoodBoundaries, setShowNeighborhoodBoundaries] =
    useState(false)
  const [mapStyleMode, setMapStyleMode] = useState<'light' | 'dark'>('light')
  const [mapFallbackNotice, setMapFallbackNotice] = useState<string | null>(
    null
  )
  const uiTone: 'light' | 'dark' = mapStyleMode === 'dark' ? 'dark' : 'light'
  const isDarkTone = uiTone === 'dark'
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)
  const listItemsRefreshKey = useTripStore((s) => s.listItemsRefreshKey)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isMobile = !isDesktop
  const ghostLocation = useDiscoveryStore((s) => s.ghostLocation)
  const previewCandidate = useDiscoveryStore((s) => s.previewCandidate)
  const previewSelectedResultId = useDiscoveryStore((s) => s.selectedResultId)
  const discoveryIsSubmitting = useDiscoveryStore((s) => s.isSubmitting)
  const discoveryError = useDiscoveryStore((s) => s.error)
  const discardPreview = useDiscoveryStore((s) => s.discardAndClear)
  const setSearchBias = useDiscoveryStore((s) => s.setSearchBias)
  const setListScopeId = useDiscoveryStore((s) => s.setListScopeId)
  const didInitActiveList = useRef(false)
  const panelModeBeforeDetailsRef = useRef<'lists'>('lists')
  const prePreviewStateRef = useRef<{
    drawerOpen: boolean
    panelMode: 'lists' | 'details'
    focusedListPlaceId: string | null
    selectedPlaceId: string | null
  } | null>(null)
  const prevPreviewIdRef = useRef<string | null>(null)
  const bumpListTagRefresh = useCallback(() => {
    setListTagRefreshKey((prev) => prev + 1)
  }, [])
  const bumpPlaceTagRefresh = useCallback(() => {
    setPlaceTagRefreshKey((prev) => prev + 1)
  }, [])
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const setActiveListItems = useTripStore((s) => s.setActiveListItems)
  const lastActiveListKey = 'acerca:lastActiveListId'
  const lastAddedPlaceKey = 'acerca:lastAddedPlaceId'

  const selectedPlaceId = searchParams.get('place')
  const selectedListParam = searchParams.get('list')
  const setPlaceParam = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get('place')
      if (current === nextId) return
      if (nextId) {
        params.set('place', nextId)
      } else {
        params.delete('place')
      }
      const next = params.toString()
      router.push(next ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const setListParam = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get('list')
      if (current === nextId) return
      if (nextId) {
        params.set('list', nextId)
      } else {
        params.delete('list')
      }
      const next = params.toString()
      router.push(next ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )
  const signInHref = useMemo(() => {
    const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return `/auth/sign-in?next=${encodeURIComponent(next)}`
  }, [pathname, searchParams])

  const activeListPlaceIdSet = useMemo(
    () => new Set(activeListPlaceIds),
    [activeListPlaceIds]
  )
  const activeListItemByPlaceId = useMemo(() => {
    const listItemMap = new Map<string, ActiveListItemState>()
    for (const item of activeListItems) {
      listItemMap.set(item.place_id, item)
    }
    return listItemMap
  }, [activeListItems])
  const activeListItemOverride = useMemo(() => {
    if (!selectedPlaceId) return null
    return activeListItemByPlaceId.get(selectedPlaceId) ?? null
  }, [activeListItemByPlaceId, selectedPlaceId])
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  )
  const urlDrivenStateActive = Boolean(selectedPlaceId || selectedListParam)
  const previewStateActive = Boolean(previewCandidate || previewSelectedResultId)
  const suppressToolsForPriority =
    isMobile && (urlDrivenStateActive || previewStateActive)
  const toolsSheetOpen = toolsOpen && !suppressToolsForPriority
  const isContextPanelOpen =
    (drawerOpen || urlDrivenStateActive || previewStateActive) &&
    !(isMobile && toolsSheetOpen)
  const fitBoundsPadding = useMemo(() => {
    const basePadding = { top: 80, bottom: 80, left: 80, right: 80 }
    if (typeof window === 'undefined') return basePadding

    if (isDesktop && isContextPanelOpen) {
      const viewportWidth = window.innerWidth
      const panelWidth = Math.min(desktopPanelWidth, viewportWidth * 0.92)
      return {
        ...basePadding,
        right: Math.round(panelWidth + 48),
      }
    }

    if (isMobile && isContextPanelOpen) {
      const viewportHeight = window.innerHeight
      const snapHeights: Record<string, number> = {
        peek: 120,
        half: viewportHeight * 0.5,
        expanded: viewportHeight * 0.85,
      }
      const sheetHeight = snapHeights[mobileSheetSnap] ?? viewportHeight * 0.5
      return {
        ...basePadding,
        bottom: Math.max(basePadding.bottom, Math.round(sheetHeight + 16)),
      }
    }

    return basePadding
  }, [isContextPanelOpen, isDesktop, isMobile, desktopPanelWidth, mobileSheetSnap])

  // Persist desktop panel width to localStorage
  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, String(desktopPanelWidth))
  }, [desktopPanelWidth])

  useEffect(() => {
    if (!toolsOpen) return
    if (!suppressToolsForPriority) return
    setToolsOpen(false)
  }, [suppressToolsForPriority, toolsOpen])

  useEffect(() => {
    if (didInitActiveList.current) return
    didInitActiveList.current = true
    if (typeof window === 'undefined') return
    if (selectedListParam) {
      setActiveListId(selectedListParam)
      setDrawerOpen(true)
      setPanelMode('lists')
      return
    }
    const stored = window.localStorage.getItem(lastActiveListKey)
    if (stored) {
      setActiveListId(stored)
      setDrawerOpen(true)
      setPanelMode('lists')
      if (selectedPlaceId) {
        setFocusedListPlaceId(selectedPlaceId)
      }
    }
  }, [lastActiveListKey, selectedListParam, selectedPlaceId])

  useEffect(() => {
    if (!selectedListParam) return
    setActiveListId(selectedListParam)
    setDrawerOpen(true)
    setPanelMode('lists')
  }, [selectedListParam])

  useEffect(() => {
    if (panelMode === 'lists') {
      panelModeBeforeDetailsRef.current = panelMode
    }
  }, [panelMode])

  useEffect(() => {
    if (selectedPlaceId) {
      setPanelMode('details')
    }
  }, [selectedPlaceId])

  useEffect(() => {
    if (previewCandidate || previewSelectedResultId) {
      setPanelMode('details')
    }
  }, [previewCandidate, previewSelectedResultId])

  useEffect(() => {
    const prev = prevPreviewIdRef.current
    const current = previewSelectedResultId ?? null

    if (!prev && current) {
      prePreviewStateRef.current = {
        drawerOpen,
        panelMode,
        focusedListPlaceId,
        selectedPlaceId,
      }
      setDrawerOpen(false)
      setFocusedListPlaceId(null)
      setPanelMode('details')
    }

    if (prev && !current) {
      const saved = prePreviewStateRef.current
      prePreviewStateRef.current = null
      if (!saved) {
        prevPreviewIdRef.current = current
        return
      }
      if (selectedPlaceId && selectedPlaceId !== saved.selectedPlaceId) {
        prevPreviewIdRef.current = current
        return
      }
      setDrawerOpen(saved.drawerOpen)
      setPanelMode(saved.panelMode)
      setFocusedListPlaceId(saved.focusedListPlaceId ?? null)
    }

    prevPreviewIdRef.current = current
  }, [
    drawerOpen,
    focusedListPlaceId,
    panelMode,
    previewSelectedResultId,
    selectedPlaceId,
  ])

  const cancelPreview = useCallback(() => {
    const saved = prePreviewStateRef.current
    prePreviewStateRef.current = null
    discardPreview()
    if (!saved) {
      setPlaceParam(null)
      return
    }
    if (!saved.selectedPlaceId) {
      setPlaceParam(null)
    } else {
      setPlaceParam(saved.selectedPlaceId)
    }
    setDrawerOpen(saved.drawerOpen)
    setPanelMode(saved.panelMode)
    setFocusedListPlaceId(saved.focusedListPlaceId ?? null)
  }, [discardPreview, setPlaceParam])

  const closePlaceDetails = useCallback(() => {
    setPlaceParam(null)
    setFocusedListPlaceId(null)
    setPanelMode(panelModeBeforeDetailsRef.current)
  }, [setPlaceParam])

  const closeWorkspace = useCallback(() => {
    setToolsOpen(false)
    if (previewSelectedResultId ?? previewCandidate) {
      cancelPreview()
      return
    }
    setDrawerOpen(false)
    setFocusedListPlaceId(null)
    setPlaceParam(null)
    setListParam(null)
    setMobileSheetSnap('half')
    discardPreview()
  }, [
    cancelPreview,
    discardPreview,
    previewCandidate,
    previewSelectedResultId,
    setListParam,
    setPlaceParam,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('acerca:mapStyleMode')
    if (stored === 'light' || stored === 'dark') {
      setMapStyleMode(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('acerca:mapStyleMode', mapStyleMode)
  }, [mapStyleMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeListId) {
      window.localStorage.setItem(lastActiveListKey, activeListId)
    } else {
      window.localStorage.removeItem(lastActiveListKey)
    }
    setFocusedListPlaceId(null)
  }, [activeListId])

  useEffect(() => {
    setListScopeId(activeListId)
  }, [activeListId, setListScopeId])

  const refreshPlaces = useCallback(() => {
    void mapShellRef.current?.fetchPlaces()
  }, [])

  const handlePlaceClick = useCallback(
    (placeId: string) => {
      if (activeListId && activeListPlaceIdSet.has(placeId)) {
        setDrawerOpen(true)
        setFocusedListPlaceId(placeId)
        setPlaceParam(placeId)
        setPanelMode('details')
        return
      }
      setFocusedListPlaceId(null)
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

  const contextOpen = isContextPanelOpen

  const previewMode = derivePreviewMode({
    previewSelectedResultId: previewSelectedResultId ?? null,
    isSubmitting: discoveryIsSubmitting,
    hasPreviewCandidate: Boolean(previewCandidate),
  })
  const isPreviewing = previewMode !== 'none'
  const isPreviewLoading = previewMode === 'loading'
  const panelTitle = 'Workspace'
  const panelSubtitle = isPreviewing
    ? 'Preview'
    : panelMode === 'details'
      ? 'Details'
      : 'Lists'
  const panelHeadingClass = isDarkTone ? 'text-slate-100' : 'text-slate-900'
  const panelMutedClass = isDarkTone ? 'text-slate-400' : 'text-slate-600'
  const stickyHeaderClass = isDarkTone
    ? 'border-white/10 bg-slate-900/70'
    : 'border-slate-300/70 bg-white/70'
  const toolsLabelClass = isDarkTone ? 'text-slate-200' : 'text-slate-800'
  const toolsSecondaryClass = isDarkTone ? 'text-slate-300' : 'text-slate-700'
  const toolsAccentClass = isDarkTone ? 'accent-slate-200' : 'accent-slate-700'
  const mapStyleActiveChipClass = isDarkTone
    ? 'border-slate-100 bg-slate-100 text-slate-900'
    : 'border-slate-900 bg-slate-900 text-slate-50'
  const mapStyleInactiveChipClass = isDarkTone
    ? 'border-white/10 text-slate-200 hover:border-white/30'
    : 'border-slate-300 text-slate-700 hover:border-slate-500'

  return (
    <div className="w-full h-screen relative" data-map-tone={uiTone}>
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
        setDrawerOpen={setDrawerOpen}
        setPanelMode={setPanelMode}
        pendingFocusPlaceId={pendingFocusPlaceId}
        setPendingFocusPlaceId={setPendingFocusPlaceId}
        previewSelectedResultId={previewSelectedResultId}
        ghostLocation={ghostLocation}
        discardPreview={discardPreview}
        mapStyleMode={mapStyleMode}
        showTransit={showTransit}
        showTransitStations={showTransitStations}
        showNeighborhoodBoundaries={showNeighborhoodBoundaries}
        setMapFallbackNotice={setMapFallbackNotice}
        setSearchBias={setSearchBias}
        onReadyChange={setMapReady}
        onPlacesChange={setPlaces}
      />
      {mapReady ? (
        <>
      <div
        className="absolute left-4 top-4 z-[70] pointer-events-none space-y-2"
        data-testid="map-overlay-left"
      >
        {mapFallbackNotice ? (
          <div className="pointer-events-auto glass-panel max-w-[320px] rounded-lg px-3 py-2">
            <p className={`text-[11px] ${panelMutedClass}`}>{mapFallbackNotice}</p>
            <button
              type="button"
              onClick={() => setMapFallbackNotice(null)}
              className="mt-2 glass-button px-2 py-1 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <Omnibox
          tone={uiTone}
          onCanonicalPlaceSelect={handleCanonicalSuggestionSelect}
        />
      </div>

      <div
        className="absolute right-4 top-4 z-[80] pointer-events-none flex flex-col items-end gap-2"
        data-testid="map-overlay-right"
      >
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (suppressToolsForPriority) return
              setToolsOpen(true)
              if (isMobile) setDrawerOpen(false)
            }}
            className="glass-button"
            disabled={suppressToolsForPriority}
          >
            Tools
          </button>
        </div>
        <div
          className={`pointer-events-auto w-full min-w-[140px] transition-opacity duration-200 ${
            isMobile && contextOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (contextOpen) {
                closeWorkspace()
              } else {
                setDrawerOpen(true)
                setPanelMode('lists')
              }
            }}
            className={`w-full rounded-full border px-4 py-2.5 text-sm font-semibold shadow-md backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              contextOpen
                ? isDarkTone
                  ? 'border-slate-100 bg-slate-100 text-slate-900 hover:bg-slate-200'
                  : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'glass-button hover:opacity-95'
            }`}
          >
            {contextOpen ? 'Hide workspace' : 'Workspace'}
          </button>
        </div>
      </div>

      {(() => {
        const listPane = (
          <ListDrawer
            open={contextOpen}
            variant="embedded"
            tone={uiTone}
            onClose={closeWorkspace}
            activeListId={activeListId}
            onActiveListChange={(id) => {
              setActiveListId(id)
              setListParam(id)
              if (id) setDrawerOpen(true)
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

        const placePane =isPreviewLoading ? (
          <div className="p-4">
            <p className={`text-sm font-medium ${panelHeadingClass}`}>Loading preview…</p>
            <p className={`mt-1 text-xs ${panelMutedClass}`}>
              Fetching details so you can decide whether to approve.
            </p>
            <button
              type="button"
              onClick={cancelPreview}
              className="mt-3 glass-button"
            >
              Cancel
            </button>
          </div>
        ) : previewMode === 'error' ? (
          <div className="p-4">
            <p className={`text-sm font-medium ${panelHeadingClass}`}>
              Preview unavailable
            </p>
            <p className={`mt-1 text-xs ${panelMutedClass}`}>
              {discoveryError || 'Could not load preview details.'}
            </p>
            <button
              type="button"
              onClick={cancelPreview}
              className="mt-3 glass-button"
            >
              Back
            </button>
          </div>
        ) : previewMode === 'ready' ? (
          <div className="p-3">
            <InspectorCard
              tone={uiTone}
              onCommitted={(placeId) => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(lastAddedPlaceKey, placeId)
                }
                setPendingFocusPlaceId(placeId)
                refreshPlaces()
                setPlaceParam(placeId)
                setPanelMode('details')
              }}
              onClose={cancelPreview}
            />
          </div>
        ) : selectedPlace ? (
          <div className="p-3">
            <PlaceDrawer
              variant="embedded"
              open={Boolean(selectedPlace)}
              place={selectedPlace}
              activeListId={activeListId}
              activeListItemOverride={activeListItemOverride}
              tone={uiTone}
              onClose={closePlaceDetails}
              tagsRefreshKey={placeTagRefreshKey}
              onTagsUpdated={bumpListTagRefresh}
            />
          </div>
        ) : (
          <div className="p-3">
            <InspectorCard
              tone={uiTone}
              onCommitted={(placeId) => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(lastAddedPlaceKey, placeId)
                }
                setPendingFocusPlaceId(placeId)
                refreshPlaces()
                setPlaceParam(placeId)
                setPanelMode('details')
              }}
              onClose={cancelPreview}
            />
            {previewCandidate ? null : (
              <p className={`mt-3 text-xs ${panelMutedClass}`}>
                Select a pin to open a place.
              </p>
            )}
          </div>
        )

        const desktopRight = isPreviewing ? (
          placePane
        ) : (
          <div>
            <div
              className={`sticky top-0 z-10 border-b px-3 py-2 backdrop-blur ${stickyHeaderClass}`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanelMode('details')}
                  className={`glass-tab ${
                    panelMode === 'details' ? 'glass-tab-active' : 'glass-tab-inactive'
                  }`}
                >
                  Details
                </button>
              </div>
            </div>
            {placePane}
          </div>
        )

        return (
          <ContextPanel
            open={contextOpen}
            title={panelTitle}
            subtitle={panelSubtitle}
            tone={uiTone}
            desktopLayout={isPreviewing ? 'single' : 'split'}
            desktopContent={desktopRight}
            onClose={closeWorkspace}
            left={isPreviewing ? undefined : listPane}
            right={desktopRight}
            desktopWidth={desktopPanelWidth}
            onDesktopWidthChange={setDesktopPanelWidth}
            mobileSnap={mobileSheetSnap}
            onMobileSnapChange={setMobileSheetSnap}
            mobileContent={
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
                  {panelMode === 'lists' ? (
                    <ListDrawer
                      open={contextOpen}
                      variant="embedded"
                      tone={uiTone}
                      onClose={closeWorkspace}
                      activeListId={activeListId}
                      onActiveListChange={(id) => {
                        setActiveListId(id)
                        setActiveListPlaceIds([])
                        setActiveListItems([])
                        setListParam(id)
                        if (id) setDrawerOpen(true)
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
                  ) : isPreviewLoading ? (
                    <div className="p-4">
                      <p className={`text-sm font-medium ${panelHeadingClass}`}>
                        Loading preview…
                      </p>
                      <p className={`mt-1 text-xs ${panelMutedClass}`}>
                        Fetching details so you can decide whether to approve.
                      </p>
                      <button
                        type="button"
                        onClick={cancelPreview}
                        className="mt-3 glass-button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : previewMode === 'error' ? (
                    <div className="p-4">
                      <p className={`text-sm font-medium ${panelHeadingClass}`}>
                        Preview unavailable
                      </p>
                      <p className={`mt-1 text-xs ${panelMutedClass}`}>
                        {discoveryError || 'Could not load preview details.'}
                      </p>
                      <button
                        type="button"
                        onClick={cancelPreview}
                        className="mt-3 glass-button"
                      >
                        Back
                      </button>
                    </div>
                  ) : previewMode === 'ready' ? (
                    <InspectorCard
                      tone={uiTone}
                      onCommitted={(placeId) => {
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem(lastAddedPlaceKey, placeId)
                        }
                        setPendingFocusPlaceId(placeId)
                        refreshPlaces()
                        setPlaceParam(placeId)
                        setPanelMode('details')
                      }}
                      onClose={cancelPreview}
                    />
                  ) : selectedPlace ? (
                    <PlaceDrawer
                      variant="embedded"
                      open={Boolean(selectedPlace)}
                      place={selectedPlace}
                      activeListId={activeListId}
                      activeListItemOverride={activeListItemOverride}
                      tone={uiTone}
                      onClose={closePlaceDetails}
                      tagsRefreshKey={placeTagRefreshKey}
                      onTagsUpdated={bumpListTagRefresh}
                    />
                  ) : (
                    <InspectorCard
                      tone={uiTone}
                      onCommitted={(placeId) => {
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem(lastAddedPlaceKey, placeId)
                        }
                        setPendingFocusPlaceId(placeId)
                        refreshPlaces()
                        setPlaceParam(placeId)
                        setPanelMode('details')
                      }}
                      onClose={cancelPreview}
                    />
                  )}
                </div>

                <div
                  className={`shrink-0 border-t px-2 py-2 ${
                    isDarkTone
                      ? 'border-white/10 bg-slate-900/65'
                      : 'border-slate-300/70 bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPanelMode('lists')}
                      className={`glass-tab ${
                        panelMode === 'lists' ? 'glass-tab-active' : 'glass-tab-inactive'
                      }`}
                    >
                      Lists
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanelMode('details')}
                      disabled={!selectedPlaceId && !previewCandidate && !previewSelectedResultId}
                      className={`glass-tab disabled:opacity-40 ${
                        panelMode === 'details' ? 'glass-tab-active' : 'glass-tab-inactive'
                      }`}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            }
          />
        )
      })()}

      <ToolsSheet open={toolsSheetOpen} tone={uiTone} onClose={() => setToolsOpen(false)}>
        <form action="/auth/sign-out" method="post">
          <button className="glass-button" type="submit">
            Sign out
          </button>
        </form>

        <div className="mt-4">
          <p className={`text-[11px] font-semibold ${toolsLabelClass}`}>Layers</p>
          <label className={`mt-2 flex items-center gap-2 text-[11px] ${toolsLabelClass}`}>
            <input
              type="checkbox"
              className={toolsAccentClass}
              checked={showTransit}
              onChange={(event) => {
                const next = event.target.checked
                setShowTransit(next)
                if (!next) {
                  setShowTransitStations(false)
                }
              }}
            />
            Transit lines
          </label>
          <label className={`mt-1 flex items-center gap-2 text-[11px] ${toolsSecondaryClass}`}>
            <input
              type="checkbox"
              className={toolsAccentClass}
              checked={showTransitStations}
              disabled={!showTransit}
              onChange={(event) => setShowTransitStations(event.target.checked)}
            />
            Stations
          </label>
          <label className={`mt-2 flex items-center gap-2 text-[11px] ${toolsLabelClass}`}>
            <input
              type="checkbox"
              className={toolsAccentClass}
              checked={showNeighborhoodBoundaries}
              onChange={(event) => setShowNeighborhoodBoundaries(event.target.checked)}
            />
            Neighborhoods
          </label>
        </div>

        <div className="mt-4">
          <p className={`text-[11px] font-semibold ${toolsLabelClass}`}>Base map</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMapStyleMode('light')}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                mapStyleMode === 'light'
                  ? mapStyleActiveChipClass
                  : mapStyleInactiveChipClass
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setMapStyleMode('dark')}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                mapStyleMode === 'dark'
                  ? mapStyleActiveChipClass
                  : mapStyleInactiveChipClass
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </ToolsSheet>
        </>
      ) : null}
    </div>
  )
}
