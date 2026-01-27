'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { CategoryEnum } from '@/lib/types/enums'
import Omnibox from '@/components/discovery/Omnibox'
import GhostMarker from '@/components/discovery/GhostMarker'
import InspectorCard from '@/components/discovery/InspectorCard'
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
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const router = useRouter()
  const ghostLocation = useDiscoveryStore((s) => s.ghostLocation)
  const clearDiscovery = useDiscoveryStore((s) => s.clear)
  const mapRef = useRef<MapRef | null>(null)

  const defaultViewState = useMemo<ViewState>(
    () => ({
      longitude: 0,
      latitude: 20,
      zoom: 1.5,
    }),
    []
  )
  const viewStorageKey = 'acerca:lastMapView'

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

    if (places.length > 0) {
      const bounds = new LngLatBounds()
      for (const place of places) {
        bounds.extend([place.lng, place.lat])
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
      }
      return
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

    map.flyTo({
      center: [defaultViewState.longitude, defaultViewState.latitude],
      zoom: defaultViewState.zoom,
    })
  }, [defaultViewState, loading, places])

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
            href="/auth/sign-in?next=/"
          >
            Sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen relative">
      <div className="absolute left-4 top-4 z-10 pointer-events-none">
        <Omnibox />
      </div>

      <div className="absolute right-4 top-4 z-10 pointer-events-none">
        <InspectorCard
          onCommitted={(placeId) => {
            setPendingFocusPlaceId(placeId)
            fetchPlaces()
            router.push(`/places/${placeId}`)
          }}
        />
      </div>

      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={defaultViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => clearDiscovery()}
        onMoveEnd={(evt) => {
          if (typeof window === 'undefined') return
          const { longitude, latitude, zoom, bearing, pitch } = evt.viewState
          window.localStorage.setItem(
            viewStorageKey,
            JSON.stringify({ longitude, latitude, zoom, bearing, pitch })
          )
        }}
        ref={mapRef}
      >
        {ghostLocation ? (
          <GhostMarker
            lng={ghostLocation.lng}
            lat={ghostLocation.lat}
          />
        ) : null}

        {places.map((place) => (
          <Marker
            key={place.id}
            longitude={place.lng}
            latitude={place.lat}
          >
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => router.push(`/places/${place.id}`)}
              aria-label={`Open ${place.name}`}
            >
              <img
                src={getCategoryIcon(place.category)}
                alt={place.category}
                className="w-6 h-6"
              />
            </button>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
