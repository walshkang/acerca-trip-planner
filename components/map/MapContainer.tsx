'use client'

import { useEffect, useRef, useState } from 'react'
import Map, { Marker } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase/client'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { CategoryEnum } from '@/lib/types/enums'

interface Place {
  id: string
  name: string
  category: CategoryEnum
  location: {
    lat: number
    lng: number
  }
}

export default function MapContainer() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    if (!mapboxToken) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    // Fetch places from Supabase
    // Note: Only reads from places table (canonical layer), never place_candidates
    async function fetchPlaces() {
      try {
        const { data, error } = await supabase
          .from('places')
          .select('id, name, category, location')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching places:', error)
          return
        }

        // Transform geography points to lat/lng
        const transformedPlaces = (data || []).map((place: any) => ({
          id: place.id,
          name: place.name,
          category: place.category,
          location: {
            lat: place.location?.coordinates?.[1] || 0,
            lng: place.location?.coordinates?.[0] || 0,
          },
        }))

        setPlaces(transformedPlaces)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaces()
  }, [mapboxToken])

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

  return (
    <div className="w-full h-screen">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: -122.4194,
          latitude: 37.7749,
          zoom: 12,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            longitude={place.location.lng}
            latitude={place.location.lat}
          >
            <div className="cursor-pointer">
              <img
                src={getCategoryIcon(place.category)}
                alt={place.category}
                className="w-6 h-6"
              />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
