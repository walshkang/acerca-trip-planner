'use client'

import { useCallback, useEffect, useState } from 'react'
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

interface Place {
  id: string
  name: string
  category: CategoryEnum
  location: {
    lat: number
    lng: number
  }
}

type PlacesRow = {
  id: string
  name: string
  category: CategoryEnum
  location: unknown
}

function extractLngLat(location: unknown): { lng: number; lat: number } | null {
  if (!location) return null

  if (typeof location === 'string') {
    // Common PostGIS textual formats:
    // - "POINT(lng lat)"
    // - "SRID=4326;POINT(lng lat)"
    const m = location.match(
      /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i
    )
    if (m) {
      const lng = Number(m[1])
      const lat = Number(m[2])
      if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat }
    }
    return null
  }

  if (typeof location === 'object') {
    // GeoJSON-like: { type: "Point", coordinates: [lng, lat] }
    const coords = (location as any).coordinates
    if (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      Number.isFinite(coords[0]) &&
      Number.isFinite(coords[1])
    ) {
      return { lng: Number(coords[0]), lat: Number(coords[1]) }
    }
  }

  return null
}

export default function MapContainer() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const router = useRouter()
  const ghostLocation = useDiscoveryStore((s) => s.ghostLocation)
  const clearDiscovery = useDiscoveryStore((s) => s.clear)

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
    // Fetch places from Supabase
    // Note: Only reads from places table (canonical layer), never place_candidates
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthed(Boolean(user))
      setAuthChecked(true)
      if (!user) return

      const { data, error } = await supabase
        .from('places')
        .select('id, name, category, location')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching places:', error)
        return
      }

      // Transform geography points to lat/lng
      const transformedPlaces = ((data || []) as PlacesRow[])
        .map((place) => {
          const ll = extractLngLat(place.location)
          if (!ll) return null
          return {
            id: place.id,
            name: place.name,
            category: place.category,
            location: { lat: ll.lat, lng: ll.lng },
          }
        })
        .filter(Boolean) as Place[]

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
            fetchPlaces()
            router.push(`/places/${placeId}`)
          }}
        />
      </div>

      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: -122.4194,
          latitude: 37.7749,
          zoom: 12,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={() => clearDiscovery()}
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
            longitude={place.location.lng}
            latitude={place.location.lat}
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
