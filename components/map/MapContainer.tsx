'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { CategoryEnum } from '@/lib/types/enums'
import MapViewMapbox from '@/components/map/MapView.mapbox'
import MapViewMaplibre from '@/components/map/MapView.maplibre'
import type {
  MapPlace,
  LatLng,
  PlaceMarkerVariant,
} from '@/components/map/MapView.types'
import Omnibox from '@/components/discovery/Omnibox'
import InspectorCard from '@/components/discovery/InspectorCard'
import ListDrawer from '@/components/lists/ListDrawer'
import ListPlanner from '@/components/lists/ListPlanner'
import PlaceDrawer from '@/components/places/PlaceDrawer'
import ContextPanel from '@/components/ui/ContextPanel'
import ToolsSheet from '@/components/ui/ToolsSheet'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { derivePreviewMode } from '@/lib/ui/previewMode'
import type { MapRef, ViewState, ViewStateChangeEvent } from 'react-map-gl'

type Bounds = { sw: LatLng; ne: LatLng }

const EARTH_RADIUS_METERS = 6371000

function haversineMeters(a: LatLng, b: LatLng) {
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(value)))
}

function boundsFromPlaces(places: MapPlace[]): Bounds | null {
  if (!places.length) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const place of places) {
    minLng = Math.min(minLng, place.lng)
    maxLng = Math.max(maxLng, place.lng)
    minLat = Math.min(minLat, place.lat)
    maxLat = Math.max(maxLat, place.lat)
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null
  return {
    sw: { lng: minLng, lat: minLat },
    ne: { lng: maxLng, lat: maxLat },
  }
}

function boundsToArray(bounds: Bounds): [[number, number], [number, number]] {
  return [
    [bounds.sw.lng, bounds.sw.lat],
    [bounds.ne.lng, bounds.ne.lat],
  ]
}

function boundsSpan(bounds: Bounds) {
  return {
    lngSpan: Math.abs(bounds.ne.lng - bounds.sw.lng),
    latSpan: Math.abs(bounds.ne.lat - bounds.sw.lat),
  }
}

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  lat: number | null
  lng: number | null
}

type ActiveListItemState = {
  id: string
  list_id: string
  place_id: string
  tags: string[]
  scheduled_date: string | null
  scheduled_start_time: string | null
  completed_at: string | null
}

export default function MapContainer() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [pendingFocusPlaceId, setPendingFocusPlaceId] = useState<string | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<'lists' | 'plan' | 'details'>(
    'lists'
  )
  const [toolsOpen, setToolsOpen] = useState(false)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [activeListPlaceIds, setActiveListPlaceIds] = useState<string[]>([])
  const [activeListItems, setActiveListItems] = useState<ActiveListItemState[]>(
    []
  )
  const [activeListTypeFilters, setActiveListTypeFilters] = useState<
    CategoryEnum[]
  >([])
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(
    null
  )
  const [showTransit, setShowTransit] = useState(false)
  const [showTransitStations, setShowTransitStations] = useState(false)
  const [showNeighborhoodBoundaries, setShowNeighborhoodBoundaries] =
    useState(false)
  const [mapStyleMode, setMapStyleMode] = useState<'light' | 'dark'>('light')
  const uiTone: 'light' | 'dark' = mapStyleMode === 'dark' ? 'dark' : 'light'
  const isDarkTone = uiTone === 'dark'
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)
  const [listItemsRefreshKey, setListItemsRefreshKey] = useState(0)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapProvider =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === 'mapbox' ? 'mapbox' : 'maplibre'
  const isMapbox = mapProvider === 'mapbox'
  const mapStyle = useMemo(() => {
    if (isMapbox) {
      return mapStyleMode === 'dark'
        ? 'mapbox://styles/mapbox/navigation-night-v1'
        : 'mapbox://styles/mapbox/light-v11'
    }
    return mapStyleMode === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  }, [isMapbox, mapStyleMode])
  const styleKey = `${mapProvider}-${mapStyleMode}`
  const markerBackdropClassName =
    mapStyleMode === 'dark'
      ? 'bg-slate-100/90 border border-white/70 shadow-[0_2px_6px_rgba(0,0,0,0.45)]'
      : 'bg-white/90 border border-slate-900/10 shadow-[0_2px_6px_rgba(15,23,42,0.15)]'
  const markerFocusClassName =
    mapStyleMode === 'dark'
      ? 'ring-2 ring-sky-400/45 shadow-[0_0_16px_rgba(56,189,248,0.55),0_0_2px_rgba(15,23,42,0.25)]'
      : 'ring-2 ring-sky-500/35 shadow-[0_0_14px_rgba(14,165,233,0.35),0_0_2px_rgba(15,23,42,0.15)]'
  const ghostMarkerClassName = `flex h-8 w-8 items-center justify-center rounded-full ${markerBackdropClassName} ${markerFocusClassName}`
  const transitLineWidth = 2.5
  const transitLineOpacity = 0.75
  const transitCasingWidth = 4
  const transitCasingOpacity = mapStyleMode === 'dark' ? 0.35 : 0.25
  const transitCasingColor = mapStyleMode === 'dark' ? '#e2e8f0' : '#0f172a'
  const neighborhoodFillColor =
    mapStyleMode === 'dark' ? '#e2e8f0' : '#94a3b8'
  const neighborhoodFillOpacity = mapStyleMode === 'dark' ? 0.08 : 0.04
  const neighborhoodOutlineColor =
    mapStyleMode === 'dark' ? '#e2e8f0' : '#94a3b8'
  const neighborhoodOutlineOpacity = mapStyleMode === 'dark' ? 0.22 : 0.16
  const neighborhoodOutlineWidth = 1
  const neighborhoodLabelMinZoom = 11.5
  const neighborhoodLabelColor =
    mapStyleMode === 'dark' ? '#e2e8f0' : '#334155'
  const neighborhoodLabelOpacity = mapStyleMode === 'dark' ? 0.7 : 0.6
  const neighborhoodLabelHaloColor =
    mapStyleMode === 'dark' ? '#0f172a' : '#f8fafc'
  const neighborhoodLabelHaloWidth = 1.25
  const canRenderMap = isMapbox ? Boolean(mapboxToken) : true
  const transitLinesUrl = '/map/overlays/nyc_subway_lines.geojson'
  const transitStationsUrl = '/map/overlays/nyc_subway_stations.geojson'
  const neighborhoodBoundariesUrl =
    '/map/overlays/nyc_neighborhood_boundaries.geojson'
  const neighborhoodLabelsUrl =
    '/map/overlays/nyc_neighborhood_labels.geojson'
  const transitBeforeId = undefined
  const neighborhoodBeforeId = transitBeforeId
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
  const clearDiscovery = useDiscoveryStore((s) => s.clear)
  const setSearchBias = useDiscoveryStore((s) => s.setSearchBias)
  const mapRef = useRef<MapRef | null>(null)
  const didInitActiveList = useRef(false)
  const previewFlyToIdRef = useRef<string | null>(null)
  const panelModeBeforeDetailsRef = useRef<'lists' | 'plan'>('lists')
  const prePreviewStateRef = useRef<{
    drawerOpen: boolean
    panelMode: 'lists' | 'plan' | 'details'
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
  const bumpListItemsRefresh = useCallback(() => {
    setListItemsRefreshKey((prev) => prev + 1)
  }, [])
  const handleActiveListPlaceIdsChange = useCallback((nextIds: string[]) => {
    setActiveListPlaceIds((prev) => {
      if (prev.length !== nextIds.length) return nextIds
      for (let i = 0; i < prev.length; i += 1) {
        if (prev[i] !== nextIds[i]) return nextIds
      }
      return prev
    })
  }, [])
  const handleActiveListItemsChange = useCallback(
    (items: ActiveListItemState[]) => {
      setActiveListItems(items)
    },
    []
  )
  const updateSearchBiasFromMap = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds() as {
      getCenter: () => LatLng
      getNorthEast: () => LatLng
    }
    const center = bounds.getCenter()
    const northEast = bounds.getNorthEast()
    const radiusMeters = haversineMeters(center, northEast)
    setSearchBias({
      lat: center.lat,
      lng: center.lng,
      radiusMeters,
    })
  }, [setSearchBias])

  const defaultViewState = useMemo<ViewState>(
    () => ({
      longitude: 0,
      latitude: 20,
      zoom: 1.5,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    }),
    []
  )
  const viewStorageKey = 'acerca:lastMapView'
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
  const activeListTypeFilterSet = useMemo(
    () => new Set(activeListTypeFilters),
    [activeListTypeFilters]
  )
  const placeIdSet = useMemo(
    () => new Set(places.map((place) => place.id)),
    [places]
  )
  const activeListPlaces = useMemo(
    () =>
      activeListPlaceIds.length
        ? places.filter((place) => activeListPlaceIdSet.has(place.id))
        : [],
    [activeListPlaceIdSet, activeListPlaceIds, places]
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
  const isContextPanelOpen =
    (drawerOpen ||
      Boolean(selectedPlaceId) ||
      Boolean(previewCandidate) ||
      Boolean(previewSelectedResultId)) &&
    !(isMobile && toolsOpen)
  const fitBoundsPadding = useMemo(() => {
    const basePadding = { top: 80, bottom: 80, left: 80, right: 80 }
    if (typeof window === 'undefined') return basePadding

    if (isDesktop && isContextPanelOpen) {
      const viewportWidth = window.innerWidth
      // Match ContextPanel desktop container width: min(760px, 92vw), with right offset.
      const panelWidth = Math.min(760, viewportWidth * 0.92)
      return {
        ...basePadding,
        right: Math.round(panelWidth + 48),
      }
    }

    if (isMobile && isContextPanelOpen) {
      const viewportHeight = window.innerHeight
      const sheetHeight = Math.min(Math.round(viewportHeight * 0.55), 420)
      return {
        ...basePadding,
        bottom: Math.max(basePadding.bottom, sheetHeight),
      }
    }

    return basePadding
  }, [isContextPanelOpen, isDesktop, isMobile])
  const isPlaceFocused = useCallback(
    (place: MapPlace) => {
      if (previewSelectedResultId) return false
      return selectedPlaceId === place.id || focusedListPlaceId === place.id
    },
    [focusedListPlaceId, previewSelectedResultId, selectedPlaceId]
  )
  const isPlaceDimmed = useCallback(
    (place: MapPlace) => {
      const dimmedByList =
        !previewSelectedResultId &&
        activeListPlaceIds.length > 0 &&
        !activeListPlaceIdSet.has(place.id)
      const dimmedByType =
        activeListTypeFilters.length > 0 &&
        !activeListTypeFilterSet.has(place.category)
      return dimmedByList || dimmedByType
    },
    [
      activeListPlaceIdSet,
      activeListPlaceIds.length,
      activeListTypeFilterSet,
      activeListTypeFilters.length,
      previewSelectedResultId,
    ]
  )
  const getPlaceMarkerVariant = useCallback(
    (place: MapPlace): PlaceMarkerVariant => {
      const listItem = activeListItemByPlaceId.get(place.id)
      if (!listItem) return 'default'
      if (listItem.completed_at) return 'done'
      if (listItem.scheduled_date) return 'scheduled'
      return 'backlog'
    },
    [activeListItemByPlaceId]
  )

  useEffect(() => {
    if (isMapbox && !mapboxToken) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthed(Boolean(user))
      setAuthChecked(true)
      return user
    }

    checkAuth().catch(() => null)
  }, [isMapbox, mapboxToken])

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
    if (panelMode === 'lists' || panelMode === 'plan') {
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
    clearDiscovery()
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
  }, [clearDiscovery, setPlaceParam])

  const closePlaceDetails = useCallback(() => {
    setPlaceParam(null)
    setFocusedListPlaceId(null)
    setPanelMode(panelModeBeforeDetailsRef.current)
  }, [setPlaceParam])

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

  const fetchPlaces = useCallback(async () => {
    // Fetch places from Supabase view
    // Note: Only reads from places_view (canonical layer), never place_candidates
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthed(Boolean(user))
      setAuthChecked(true)
      if (!user) return

      const { data, error } = await supabase
        .from('places_view')
        .select('id, name, category, lat, lng')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching places:', error)
        return
      }

      const transformedPlaces = ((data || []) as PlacesRow[])
        .filter((place) => place.lat != null && place.lng != null)
        .map((place) => ({
          id: place.id,
          name: place.name,
          category: place.category,
          lat: place.lat as number,
          lng: place.lng as number,
        }))

      setPlaces(transformedPlaces)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canRenderMap) return
    fetchPlaces()
  }, [canRenderMap, fetchPlaces])

  useEffect(() => {
    if (!previewSelectedResultId) {
      previewFlyToIdRef.current = null
      return
    }
    if (!ghostLocation) return
    if (previewFlyToIdRef.current === previewSelectedResultId) return
    const map = mapRef.current
    if (!map) return

    previewFlyToIdRef.current = previewSelectedResultId
    map.flyTo({
      center: [ghostLocation.lng, ghostLocation.lat],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: 900,
    })
  }, [ghostLocation, previewSelectedResultId])

  useEffect(() => {
    if (loading) return
    const map = mapRef.current
    if (!map) return

    const fitPlaces = (selected: MapPlace[]) => {
      const bounds = boundsFromPlaces(selected)
      if (!bounds) return false
      map.fitBounds(boundsToArray(bounds), {
        padding: fitBoundsPadding,
        maxZoom: 14,
      })
      return true
    }

    if (activeListId) {
      if (activeListPlaces.length) {
        if (fitPlaces(activeListPlaces)) return
      }
      // Keep the map static when switching to an empty list.
      return
    }

    if (typeof window !== 'undefined') {
      const lastAdded = window.localStorage.getItem(lastAddedPlaceKey)
      if (lastAdded) {
        const focused = places.find((place) => place.id === lastAdded)
        if (focused) {
          map.flyTo({
            center: [focused.lng, focused.lat],
            zoom: Math.max(map.getZoom(), 13),
          })
          return
        }
      }
    }

    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(viewStorageKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ViewState>
        if (
          typeof parsed.longitude === 'number' &&
          typeof parsed.latitude === 'number' &&
          typeof parsed.zoom === 'number'
        ) {
          map.flyTo({
            center: [parsed.longitude, parsed.latitude],
            zoom: parsed.zoom,
            bearing: parsed.bearing ?? 0,
            pitch: parsed.pitch ?? 0,
          })
          return
        }
      } catch {
        // ignore invalid saved state
      }
    }

    if (places.length > 0) {
      const bounds = boundsFromPlaces(places)
      if (bounds) {
        const { lngSpan, latSpan } = boundsSpan(bounds)
        if (lngSpan < 90 && latSpan < 45) {
          map.fitBounds(boundsToArray(bounds), {
            padding: fitBoundsPadding,
            maxZoom: 14,
          })
          return
        }
      }
    }

    map.flyTo({
      center: [defaultViewState.longitude, defaultViewState.latitude],
      zoom: defaultViewState.zoom,
    })
  }, [
    activeListId,
    activeListPlaces,
    defaultViewState,
    fitBoundsPadding,
    loading,
    places,
  ])

  useEffect(() => {
    if (!selectedPlaceId) return
    if (loading) return
    if (placeIdSet.has(selectedPlaceId)) return
    if (activeListPlaceIdSet.has(selectedPlaceId)) {
      fetchPlaces()
      return
    }
    setPlaceParam(null)
  }, [
    activeListPlaceIdSet,
    fetchPlaces,
    loading,
    placeIdSet,
    selectedPlaceId,
    setPlaceParam,
  ])

  useEffect(() => {
    if (!activeListPlaceIds.length) return
    const missing = activeListPlaceIds.some((id) => !placeIdSet.has(id))
    if (missing) {
      fetchPlaces()
    }
  }, [activeListPlaceIds, fetchPlaces, placeIdSet])

  useEffect(() => {
    if (!pendingFocusPlaceId) return
    if (loading) return
    const map = mapRef.current
    if (!map) return

    const focused = places.find((place) => place.id === pendingFocusPlaceId)
    if (!focused) return

    map.flyTo({
      center: [focused.lng, focused.lat],
      zoom: Math.max(map.getZoom(), 13),
    })
    setPendingFocusPlaceId(null)
  }, [loading, pendingFocusPlaceId, places])

  useEffect(() => {
    if (loading) return
    updateSearchBiasFromMap()
  }, [loading, updateSearchBiasFromMap])

  const handleMapClick = useCallback(() => {
    clearDiscovery()
    setFocusedListPlaceId(null)
    if (selectedPlaceId) {
      setPlaceParam(null)
    }
  }, [clearDiscovery, selectedPlaceId, setPlaceParam])

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      if (typeof window === 'undefined') return
      const { longitude, latitude, zoom, bearing, pitch } = evt.viewState
      window.localStorage.setItem(
        viewStorageKey,
        JSON.stringify({ longitude, latitude, zoom, bearing, pitch })
      )
      updateSearchBiasFromMap()
    },
    [updateSearchBiasFromMap]
  )

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
  const MapView = isMapbox ? MapViewMapbox : MapViewMaplibre

  if (isMapbox && !mapboxToken) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Mapbox token is not configured</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading map...</p>
      </div>
    )
  }

  if (authChecked && !isAuthed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-700">You’re signed out.</p>
          <a
            className="mt-2 inline-block text-sm underline"
            href={signInHref}
          >
            Sign in
          </a>
        </div>
      </div>
    )
  }

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
      : panelMode === 'plan'
        ? 'Plan'
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
      <div
        className="absolute left-4 top-4 z-[70] pointer-events-none space-y-2"
        data-testid="map-overlay-left"
      >
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setDrawerOpen((prev) => !prev)
              setPanelMode('lists')
            }}
            className="glass-button"
          >
            {drawerOpen ? 'Hide lists' : 'Lists'}
          </button>
        </div>
        <Omnibox tone={uiTone} />
      </div>

      <div
        className="absolute right-4 top-4 z-[80] pointer-events-none"
        data-testid="map-overlay-right"
      >
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setToolsOpen(true)
              if (isMobile) setDrawerOpen(false)
            }}
            className="glass-button"
          >
            Tools
          </button>
        </div>
      </div>

      {(() => {
        const listPane = (
          <ListDrawer
            open={contextOpen}
            variant="embedded"
            tone={uiTone}
            onClose={() => setDrawerOpen(false)}
            activeListId={activeListId}
            onActiveListChange={(id) => {
              setActiveListId(id)
              setActiveListPlaceIds([])
              setActiveListItems([])
              setListParam(id)
              if (id) setDrawerOpen(true)
            }}
            onPlaceIdsChange={handleActiveListPlaceIdsChange}
            onActiveTypeFiltersChange={setActiveListTypeFilters}
            onActiveListItemsChange={handleActiveListItemsChange}
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

        const planPane = (
          <ListPlanner
            listId={activeListId}
            tone={uiTone}
            onPlanMutated={bumpListItemsRefresh}
            onPlaceSelect={(placeId) => {
              setPendingFocusPlaceId(placeId)
              setPlaceParam(placeId)
              setFocusedListPlaceId(placeId)
              setPanelMode('details')
            }}
          />
        )

        const placePane = isPreviewLoading ? (
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
                fetchPlaces()
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
                fetchPlaces()
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
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(true)
                    setPanelMode('plan')
                  }}
                  className={`glass-tab ${
                    panelMode === 'plan' ? 'glass-tab-active' : 'glass-tab-inactive'
                  }`}
                >
                  Plan
                </button>
              </div>
            </div>
            {panelMode === 'plan' ? planPane : placePane}
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
            onClose={() => {
              setToolsOpen(false)
              if (isPreviewing) {
                cancelPreview()
                return
              }
              setDrawerOpen(false)
              setFocusedListPlaceId(null)
              setPlaceParam(null)
              clearDiscovery()
            }}
            left={isPreviewing ? undefined : listPane}
            right={desktopRight}
            mobileContent={
          <div className="p-1">
            <div className="flex items-center gap-2 px-2 py-2">
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
                onClick={() => {
                  setDrawerOpen(true)
                  setPanelMode('plan')
                }}
                className={`glass-tab ${
                  panelMode === 'plan' ? 'glass-tab-active' : 'glass-tab-inactive'
                }`}
              >
                Plan
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

            <div className="px-2 pb-2">
              {panelMode === 'lists' ? (
                <ListDrawer
                  open={contextOpen}
                  variant="embedded"
                  tone={uiTone}
                  onClose={() => setDrawerOpen(false)}
                  activeListId={activeListId}
                  onActiveListChange={(id) => {
                    setActiveListId(id)
                    setActiveListPlaceIds([])
                    setActiveListItems([])
                    setListParam(id)
                    if (id) setDrawerOpen(true)
                  }}
                  onPlaceIdsChange={handleActiveListPlaceIdsChange}
                  onActiveTypeFiltersChange={setActiveListTypeFilters}
                  onActiveListItemsChange={handleActiveListItemsChange}
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
              ) : panelMode === 'plan' ? (
                planPane
              ) : isPreviewLoading ? (
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
                <InspectorCard
                  tone={uiTone}
                  onCommitted={(placeId) => {
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(lastAddedPlaceKey, placeId)
                    }
                    setPendingFocusPlaceId(placeId)
                    fetchPlaces()
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
                    fetchPlaces()
                    setPlaceParam(placeId)
                    setPanelMode('details')
                  }}
                  onClose={cancelPreview}
                />
              )}
            </div>
          </div>
            }
          />
        )
      })()}

      <ToolsSheet open={toolsOpen} tone={uiTone} onClose={() => setToolsOpen(false)}>
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

      <MapView
        ref={mapRef}
        mapboxAccessToken={isMapbox ? mapboxToken : undefined}
        initialViewState={defaultViewState}
        mapStyle={mapStyle}
        onMapClick={handleMapClick}
        onMoveEnd={handleMoveEnd}
        places={places}
        ghostLocation={ghostLocation}
        onPlaceClick={handlePlaceClick}
        isPlaceDimmed={isPlaceDimmed}
        isPlaceFocused={isPlaceFocused}
        getPlaceMarkerVariant={getPlaceMarkerVariant}
        markerFocusClassName={markerFocusClassName}
        ghostMarkerClassName={ghostMarkerClassName}
        showTransit={showTransit}
        showTransitStations={showTransitStations}
        transitLinesUrl={transitLinesUrl}
        transitStationsUrl={transitStationsUrl}
        transitBeforeId={transitBeforeId}
        transitLineWidth={transitLineWidth}
        transitLineOpacity={transitLineOpacity}
        transitCasingWidth={transitCasingWidth}
        transitCasingColor={transitCasingColor}
        transitCasingOpacity={transitCasingOpacity}
        showNeighborhoodBoundaries={showNeighborhoodBoundaries}
        neighborhoodBoundariesUrl={neighborhoodBoundariesUrl}
        neighborhoodLabelsUrl={neighborhoodLabelsUrl}
        neighborhoodBeforeId={neighborhoodBeforeId}
        neighborhoodFillColor={neighborhoodFillColor}
        neighborhoodFillOpacity={neighborhoodFillOpacity}
        neighborhoodOutlineColor={neighborhoodOutlineColor}
        neighborhoodOutlineOpacity={neighborhoodOutlineOpacity}
        neighborhoodOutlineWidth={neighborhoodOutlineWidth}
        showNeighborhoodLabels={showNeighborhoodBoundaries}
        neighborhoodLabelMinZoom={neighborhoodLabelMinZoom}
        neighborhoodLabelColor={neighborhoodLabelColor}
        neighborhoodLabelOpacity={neighborhoodLabelOpacity}
        neighborhoodLabelHaloColor={neighborhoodLabelHaloColor}
        neighborhoodLabelHaloWidth={neighborhoodLabelHaloWidth}
        markerBackdropClassName={markerBackdropClassName}
        styleKey={styleKey}
      />
    </div>
  )
}
