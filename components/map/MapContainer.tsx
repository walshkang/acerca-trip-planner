'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { CategoryEnum } from '@/lib/types/enums'
import { PLACE_ICON_GLOW } from '@/lib/ui/glow'
import Omnibox from '@/components/discovery/Omnibox'
import GhostMarker from '@/components/discovery/GhostMarker'
import InspectorCard from '@/components/discovery/InspectorCard'
import ListDrawer from '@/components/lists/ListDrawer'
import PlaceDrawer from '@/components/places/PlaceDrawer'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import type { MapRef, ViewState } from 'react-map-gl'
import { LngLatBounds } from 'mapbox-gl'

interface Place {
  id: string
  name: string
  category: CategoryEnum
  lat: number
  lng: number
}

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  lat: number | null
  lng: number | null
}

export default function MapContainer() {
  const [places, setPlaces] = useState<Place[]>([])
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
  const [focusedListPlaceId, setFocusedListPlaceId] = useState<string | null>(
    null
  )
  const [inspectorHeight, setInspectorHeight] = useState(0)
  const [listTagRefreshKey, setListTagRefreshKey] = useState(0)
  const [placeTagRefreshKey, setPlaceTagRefreshKey] = useState(0)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
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

  useEffect(() => {
    if (!mapboxToken) {
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
  }, [mapboxToken])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(lastActiveListKey)
    if (stored) {
      setActiveListId(stored)
    }
  }, [])

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
    if (!mapboxToken) return
    fetchPlaces()
  }, [mapboxToken, fetchPlaces])

  useEffect(() => {
    if (loading) return
    const map = mapRef.current
    if (!map) return

    const fitPlaces = (selected: Place[]) => {
      const bounds = new LngLatBounds()
      for (const place of selected) {
        bounds.extend([place.lng, place.lat])
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
        return true
      }
      return false
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
      const bounds = new LngLatBounds()
      for (const place of places) {
        bounds.extend([place.lng, place.lat])
      }
      if (!bounds.isEmpty()) {
        const lngSpan = Math.abs(bounds.getEast() - bounds.getWest())
        const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth())
        if (lngSpan < 90 && latSpan < 45) {
          map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
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
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const center = bounds.getCenter()
    const radiusMeters = center.distanceTo(bounds.getNorthEast())
    setSearchBias({
      lat: center.lat,
      lng: center.lng,
      radiusMeters,
    })
  }, [loading, setSearchBias])

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

  if (!mapboxToken) {
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

      <MapGL
        mapboxAccessToken={mapboxToken}
        initialViewState={defaultViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => {
          clearDiscovery()
          if (selectedPlaceId) {
            setPlaceParam(null)
          }
        }}
        onMoveEnd={(evt) => {
          if (typeof window === 'undefined') return
          const { longitude, latitude, zoom, bearing, pitch } = evt.viewState
          window.localStorage.setItem(
            viewStorageKey,
            JSON.stringify({ longitude, latitude, zoom, bearing, pitch })
          )
          const map = mapRef.current
          if (map) {
            const bounds = map.getBounds()
            const center = bounds.getCenter()
            const radiusMeters = center.distanceTo(bounds.getNorthEast())
            setSearchBias({
              lat: center.lat,
              lng: center.lng,
              radiusMeters,
            })
          }
        }}
        ref={mapRef}
      >
        {ghostLocation ? (
          <GhostMarker
            lng={ghostLocation.lng}
            lat={ghostLocation.lat}
          />
        ) : null}

        {places.map((place) => {
          const isFocusedMarker =
            selectedPlaceId === place.id ||
            focusedListPlaceId === place.id
          return (
            <Marker
              key={place.id}
              longitude={place.lng}
              latitude={place.lat}
            >
            <button
              type="button"
              className={`cursor-pointer transition-opacity ${
                activeListPlaceIds.length &&
                !activeListPlaceIdSet.has(place.id)
                  ? 'opacity-30'
                  : 'opacity-100'
              }`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const native = event.nativeEvent as MouseEvent
                if (native?.stopImmediatePropagation) {
                  native.stopImmediatePropagation()
                }
                if (native?.stopPropagation) {
                  native.stopPropagation()
                }
                if (activeListId && activeListPlaceIdSet.has(place.id)) {
                  setDrawerOpen(true)
                  setFocusedListPlaceId(place.id)
                  setPlaceParam(place.id)
                  return
                }
                setFocusedListPlaceId(null)
                setPlaceParam(place.id)
              }}
              aria-label={`Open ${place.name}`}
            >
              <img
                src={getCategoryIcon(place.category)}
                alt={place.category}
                className={`w-6 h-6 ${isFocusedMarker ? PLACE_ICON_GLOW : ''}`}
              />
            </button>
            </Marker>
          )
        })}
      </MapGL>
    </div>
  )
}
