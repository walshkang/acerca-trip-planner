'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { CategoryEnum } from '@/lib/types/enums'
import MapViewMapbox from '@/components/map/MapView.mapbox'
import MapViewMaplibre from '@/components/map/MapView.maplibre'
import type { MapPlace, LatLng } from '@/components/map/MapView.types'
import Omnibox from '@/components/discovery/Omnibox'
import InspectorCard from '@/components/discovery/InspectorCard'
import ListDrawer from '@/components/lists/ListDrawer'
import PlaceDrawer from '@/components/places/PlaceDrawer'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
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

export default function MapContainer() {
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [pendingFocusPlaceId, setPendingFocusPlaceId] = useState<string | null>(
    null
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [activeListPlaceIds, setActiveListPlaceIds] = useState<string[]>([])
  const [activeListItems, setActiveListItems] = useState<
    Array<{ id: string; list_id: string; place_id: string; tags: string[] }>
  >([])
  const [activeListTypeFilters, setActiveListTypeFilters] = useState<
    CategoryEnum[]
  >([])
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(
    null
  )
  const [showTransit, setShowTransit] = useState(false)
  const [showTransitStations, setShowTransitStations] = useState(false)
  const [mapStyleMode, setMapStyleMode] = useState<'light' | 'dark'>('light')
  const [inspectorHeight, setInspectorHeight] = useState(0)
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapProvider =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === 'maplibre' ? 'maplibre' : 'mapbox'
  const isMapbox = mapProvider === 'mapbox'
  const mapStyle = useMemo(() => {
    if (isMapbox) {
      return mapStyleMode === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12'
    }
    return mapStyleMode === 'dark'
      ? '/map/style.maplibre.dark.json'
      : '/map/style.maplibre.json'
  }, [isMapbox, mapStyleMode])
  const canRenderMap = isMapbox ? Boolean(mapboxToken) : true
  const transitLinesUrl = '/map/overlays/nyc_subway_lines.geojson'
  const transitStationsUrl = '/map/overlays/nyc_subway_stations.geojson'
  const transitBeforeId =
    !isMapbox && mapStyleMode === 'dark' ? 'maplibre-dark-labels' : undefined
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ghostLocation = useDiscoveryStore((s) => s.ghostLocation)
  const clearDiscovery = useDiscoveryStore((s) => s.clear)
  const setSearchBias = useDiscoveryStore((s) => s.setSearchBias)
  const mapRef = useRef<MapRef | null>(null)
  const inspectorRef = useRef<HTMLDivElement | null>(null)
  const bumpListTagRefresh = useCallback(() => {
    setListTagRefreshKey((prev) => prev + 1)
  }, [])
  const bumpPlaceTagRefresh = useCallback(() => {
    setPlaceTagRefreshKey((prev) => prev + 1)
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
    (
      items: Array<{
        id: string
        list_id: string
        place_id: string
        tags: string[]
      }>
    ) => {
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
    }),
    []
  )
  const viewStorageKey = 'acerca:lastMapView'
  const lastActiveListKey = 'acerca:lastActiveListId'
  const lastAddedPlaceKey = 'acerca:lastAddedPlaceId'

  const selectedPlaceId = searchParams.get('place')
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
    const listItemMap = new Map<
      string,
      { id: string; list_id: string; tags: string[] }
    >()
    for (const item of activeListItems) {
      listItemMap.set(item.place_id, {
        id: item.id,
        list_id: item.list_id,
        tags: item.tags,
      })
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
  const isPlaceFocused = useCallback(
    (place: MapPlace) =>
      selectedPlaceId === place.id || focusedListPlaceId === place.id,
    [focusedListPlaceId, selectedPlaceId]
  )
  const isPlaceDimmed = useCallback(
    (place: MapPlace) => {
      const dimmedByList =
        activeListPlaceIds.length > 0 && !activeListPlaceIdSet.has(place.id)
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
    ]
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
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(lastActiveListKey)
    if (stored) {
      setActiveListId(stored)
    }
  }, [])

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
    if (loading) return
    const map = mapRef.current
    if (!map) return

    const fitPlaces = (selected: MapPlace[]) => {
      const bounds = boundsFromPlaces(selected)
      if (!bounds) return false
      map.fitBounds(boundsToArray(bounds), { padding: 80, maxZoom: 14 })
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
          map.fitBounds(boundsToArray(bounds), { padding: 80, maxZoom: 14 })
          return
        }
      }
    }

    map.flyTo({
      center: [defaultViewState.longitude, defaultViewState.latitude],
      zoom: defaultViewState.zoom,
    })
  }, [activeListId, activeListPlaces, defaultViewState, loading, places])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const node = inspectorRef.current
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      setInspectorHeight(rect.height || 0)
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleMapClick = useCallback(() => {
    clearDiscovery()
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
        return
      }
      setFocusedListPlaceId(null)
      setPlaceParam(placeId)
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

  return (
    <div className="w-full h-screen relative">
      <div
        className="absolute left-4 top-4 z-[70] pointer-events-none space-y-2"
        data-testid="map-overlay-left"
      >
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="glass-button"
          >
            {drawerOpen ? 'Hide lists' : 'Lists'}
          </button>
        </div>
        <Omnibox />
      </div>

      <div
        ref={inspectorRef}
        className="absolute right-4 top-4 z-[80] pointer-events-none space-y-2"
        data-testid="map-overlay-right"
      >
        <form
          action="/auth/sign-out"
          method="post"
          className="pointer-events-auto"
        >
          <button
            className="glass-button"
            type="submit"
          >
            Sign out
          </button>
        </form>
        <div className="pointer-events-auto">
          <div className="glass-panel rounded-lg px-3 py-2 text-slate-100">
            <p className="text-[11px] font-semibold text-slate-200">Layers</p>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-200">
              <input
                type="checkbox"
                className="accent-slate-200"
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
            <label className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                className="accent-slate-200"
                checked={showTransitStations}
                disabled={!showTransit}
                onChange={(event) => setShowTransitStations(event.target.checked)}
              />
              Stations
            </label>
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-slate-200">
                Base map
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMapStyleMode('light')}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                    mapStyleMode === 'light'
                      ? 'border-slate-100 bg-slate-100 text-slate-900'
                      : 'border-white/10 text-slate-200 hover:border-white/30'
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setMapStyleMode('dark')}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                    mapStyleMode === 'dark'
                      ? 'border-slate-100 bg-slate-100 text-slate-900'
                      : 'border-white/10 text-slate-200 hover:border-white/30'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto">
          <InspectorCard
            onCommitted={(placeId) => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(lastAddedPlaceKey, placeId)
              }
              setPendingFocusPlaceId(placeId)
              fetchPlaces()
              setPlaceParam(placeId)
            }}
          />
        </div>
      </div>

      <ListDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeListId={activeListId}
        onActiveListChange={(id) => {
          setActiveListId(id)
          setActiveListPlaceIds([])
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
        }}
        tagsRefreshKey={listTagRefreshKey}
        onTagsUpdated={bumpPlaceTagRefresh}
      />

      <PlaceDrawer
        open={Boolean(selectedPlace)}
        place={selectedPlace}
        activeListId={activeListId}
        activeListItemOverride={activeListItemOverride}
        topOffset={inspectorHeight}
        onClose={() => setPlaceParam(null)}
        tagsRefreshKey={placeTagRefreshKey}
        onTagsUpdated={bumpListTagRefresh}
      />

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
        showTransit={showTransit}
        showTransitStations={showTransitStations}
        transitLinesUrl={transitLinesUrl}
        transitStationsUrl={transitStationsUrl}
        transitBeforeId={transitBeforeId}
      />
    </div>
  )
}
