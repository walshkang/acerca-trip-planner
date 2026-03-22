'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import type { CategoryEnum } from '@/lib/types/enums'
import MapViewMapbox from '@/components/map/MapView.mapbox'
import MapViewMaplibre from '@/components/map/MapView.maplibre'
import type {
  MapMoveEndEvent,
  MapPlace,
  LatLng,
  MapViewRef,
  PlaceMarkerVariant,
} from '@/components/map/MapView.types'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import {
  extractMapErrorText,
  normalizeMaplibreStyleSource,
  resolveMapStyle,
  shouldFallbackFromPmtiles,
  type MaplibreStyleSource,
} from '@/lib/map/styleResolver'
import type { ViewState } from 'react-map-gl/maplibre'

export type ActiveListItemState = {
  id: string
  list_id: string
  place_id: string
  tags: string[]
  scheduled_date: string | null
  scheduled_start_time: string | null
  completed_at: string | null
  day_index: number | null
}

type Bounds = { sw: LatLng; ne: LatLng }

const EARTH_RADIUS_METERS = 6371000
const PMTILES_ARCHIVE_URL = '/map/nyc.pmtiles'
const viewStorageKey = 'acerca:lastMapView'

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  lat: number | null
  lng: number | null
}

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

export type MapShellHandle = {
  fetchPlaces: () => Promise<void>
}

export type MapShellProps = {
  signInHref: string
  fitBoundsPadding: { top: number; bottom: number; left: number; right: number }
  selectedPlaceId: string | null
  setPlaceParam: (id: string | null) => void
  activeListId: string | null
  activeListPlaceIds: string[]
  activeListItems: ActiveListItemState[]
  activeListTypeFilters: CategoryEnum[]
  focusedListPlaceId: string | null
  setFocusedListPlaceId: (id: string | null) => void
  setDrawerOpen: (open: boolean) => void
  setPanelMode: (mode: 'lists' | 'plan' | 'details') => void
  pendingFocusPlaceId: string | null
  setPendingFocusPlaceId: (id: string | null) => void
  previewSelectedResultId: string | null
  ghostLocation: LatLng | null
  discardPreview: () => void
  mapStyleMode: 'light' | 'dark'
  showTransit: boolean
  showTransitStations: boolean
  showNeighborhoodBoundaries: boolean
  setMapFallbackNotice: (message: string | null) => void
  setSearchBias: (bias: {
    lat: number
    lng: number
    radiusMeters: number
  } | null) => void
  /** When true, map is interactive and workspace chrome (overlays) may render on top. */
  onReadyChange?: (ready: boolean) => void
  onPlacesChange?: (places: MapPlace[]) => void
  className?: string
}

const MapShell = forwardRef<MapShellHandle, MapShellProps>(function MapShell(
  {
    signInHref,
    fitBoundsPadding,
    selectedPlaceId,
    setPlaceParam,
    activeListId,
    activeListPlaceIds,
    activeListItems,
    activeListTypeFilters,
    focusedListPlaceId,
    setFocusedListPlaceId,
    setDrawerOpen,
    setPanelMode,
    pendingFocusPlaceId,
    setPendingFocusPlaceId,
    previewSelectedResultId,
    ghostLocation,
    discardPreview,
    mapStyleMode,
    showTransit,
    showTransitStations,
    showNeighborhoodBoundaries,
    setMapFallbackNotice,
    setSearchBias,
    onReadyChange,
    onPlacesChange,
    className,
  },
  ref
) {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [runtimeMaplibreStyleSource, setRuntimeMaplibreStyleSource] =
    useState<MaplibreStyleSource | null>(null)
  const mapRef = useRef<MapViewRef | null>(null)
  const previewFlyToIdRef = useRef<string | null>(null)

  const { resolveCategoryEmoji } = useCategoryIconOverrides(activeListId)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapProvider =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === 'mapbox' ? 'mapbox' : 'maplibre'
  const maplibreStyleSource = process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE
  const isMapbox = mapProvider === 'mapbox'
  const configuredMaplibreStyleSource = useMemo(
    () => normalizeMaplibreStyleSource(maplibreStyleSource),
    [maplibreStyleSource]
  )
  const effectiveMaplibreStyleSource =
    runtimeMaplibreStyleSource ?? configuredMaplibreStyleSource
  const {
    mapStyle,
    styleSource,
    styleKey,
    transitBeforeId,
    neighborhoodBeforeId,
    transitBeforeIdCandidates,
    neighborhoodBeforeIdCandidates,
  } = useMemo(
    () =>
      resolveMapStyle({
        provider: mapProvider,
        tone: mapStyleMode,
        maplibreStyleSource: effectiveMaplibreStyleSource,
      }),
    [effectiveMaplibreStyleSource, mapProvider, mapStyleMode]
  )
  const markerBackdropClassName =
    mapStyleMode === 'dark'
      ? 'bg-slate-100/95 border-2 border-slate-900/20 shadow-[0_8px_20px_rgba(2,6,23,0.5)]'
      : 'bg-white/95 border-2 border-slate-900/20 shadow-[0_8px_20px_rgba(15,23,42,0.2)]'
  const markerFocusClassName =
    mapStyleMode === 'dark'
      ? 'ring-2 ring-sky-300/70 shadow-[0_0_20px_rgba(56,189,248,0.65),0_0_2px_rgba(15,23,42,0.25)]'
      : 'ring-2 ring-sky-500/55 shadow-[0_0_18px_rgba(14,165,233,0.48),0_0_2px_rgba(15,23,42,0.15)]'
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

  const lastAddedPlaceKey = 'acerca:lastAddedPlaceId'

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

  const handleMapError = useCallback(
    (error: unknown) => {
      const hasFallbackApplied = runtimeMaplibreStyleSource === 'carto'
      if (
        !shouldFallbackFromPmtiles({
          provider: mapProvider,
          currentStyleSource: styleSource,
          hasFallbackApplied,
          error,
        })
      ) {
        return
      }

      const text = extractMapErrorText(error) || 'Unknown map error'
      console.warn(
        '[map] PMTiles failed, falling back to Carto for this session.',
        text
      )
      setRuntimeMaplibreStyleSource('carto')
      setMapFallbackNotice(
        'PMTiles tiles were unavailable. Switched to Carto style for this session.'
      )
    },
    [mapProvider, runtimeMaplibreStyleSource, setMapFallbackNotice, styleSource]
  )

  const fetchPlaces = useCallback(async () => {
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

  useImperativeHandle(ref, () => ({ fetchPlaces }), [fetchPlaces])

  const mapInteractive =
    !loading &&
    authChecked &&
    isAuthed &&
    (!isMapbox || Boolean(mapboxToken))

  useEffect(() => {
    onReadyChange?.(mapInteractive)
  }, [mapInteractive, onReadyChange])

  useEffect(() => {
    onPlacesChange?.(places)
  }, [places, onPlacesChange])

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
    }

    checkAuth().catch(() => null)
  }, [isMapbox, mapboxToken])

  useEffect(() => {
    setRuntimeMaplibreStyleSource(null)
    setMapFallbackNotice(null)
  }, [configuredMaplibreStyleSource, mapProvider, setMapFallbackNotice])

  useEffect(() => {
    if (mapProvider !== 'maplibre') return
    if (styleSource !== 'pmtiles') return
    if (runtimeMaplibreStyleSource === 'carto') return

    let cancelled = false
    const healthCheck = async () => {
      try {
        const response = await fetch(PMTILES_ARCHIVE_URL, {
          method: 'HEAD',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`PMTiles healthcheck failed: HTTP ${response.status}`)
        }
      } catch (error) {
        if (cancelled) return
        const details = extractMapErrorText(error)
        const wrappedError = new Error(
          `PMTiles healthcheck failed: ${details || 'unknown error'}`
        )
        handleMapError(wrappedError)
      }
    }

    healthCheck().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [
    handleMapError,
    mapProvider,
    runtimeMaplibreStyleSource,
    styleKey,
    styleSource,
  ])

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
        // ignore
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
  }, [loading, pendingFocusPlaceId, places, setPendingFocusPlaceId])

  useEffect(() => {
    if (loading) return
    updateSearchBiasFromMap()
  }, [loading, updateSearchBiasFromMap])

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

  const handleMapClick = useCallback(() => {
    discardPreview()
    setFocusedListPlaceId(null)
    if (selectedPlaceId) {
      setPlaceParam(null)
    }
  }, [discardPreview, selectedPlaceId, setFocusedListPlaceId, setPlaceParam])

  const handleMoveEnd = useCallback(
    (evt: MapMoveEndEvent) => {
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
    [
      activeListId,
      activeListPlaceIdSet,
      setDrawerOpen,
      setFocusedListPlaceId,
      setPanelMode,
      setPlaceParam,
    ]
  )

  const MapView = isMapbox ? MapViewMapbox : MapViewMaplibre

  if (isMapbox && !mapboxToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Mapbox token is not configured</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading map...</p>
      </div>
    )
  }

  if (authChecked && !isAuthed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-700">You’re signed out.</p>
          <a className="mt-2 inline-block text-sm underline" href={signInHref}>
            Sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? 'absolute inset-0 z-0 min-h-0'}>
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
      resolveCategoryEmoji={resolveCategoryEmoji}
      markerFocusClassName={markerFocusClassName}
      ghostMarkerClassName={ghostMarkerClassName}
      showTransit={showTransit}
      showTransitStations={showTransitStations}
      transitLinesUrl={transitLinesUrl}
      transitStationsUrl={transitStationsUrl}
      transitBeforeId={transitBeforeId}
      transitBeforeIdCandidates={transitBeforeIdCandidates}
      transitLineWidth={transitLineWidth}
      transitLineOpacity={transitLineOpacity}
      transitCasingWidth={transitCasingWidth}
      transitCasingColor={transitCasingColor}
      transitCasingOpacity={transitCasingOpacity}
      showNeighborhoodBoundaries={showNeighborhoodBoundaries}
      neighborhoodBoundariesUrl={neighborhoodBoundariesUrl}
      neighborhoodLabelsUrl={neighborhoodLabelsUrl}
      neighborhoodBeforeId={neighborhoodBeforeId}
      neighborhoodBeforeIdCandidates={neighborhoodBeforeIdCandidates}
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
      onMapError={handleMapError}
    />
    </div>
  )
})

export default MapShell
