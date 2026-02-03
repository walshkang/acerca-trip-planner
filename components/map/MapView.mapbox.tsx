'use client'

import { forwardRef } from 'react'
import MapGL, { Marker } from 'react-map-gl/mapbox'
import { Layer, Source } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getCategoryIcon } from '@/lib/icons/mapping'
import { PLACE_ICON_GLOW } from '@/lib/ui/glow'
import type { MapViewProps, MapViewRef } from './MapView.types'
import { useGeoJson } from './useGeoJson'

const transitLineLayer = {
  id: 'transit-lines',
  type: 'line' as const,
  source: 'transit-lines',
  paint: {
    'line-color': '#38bdf8',
    'line-width': 2,
    'line-opacity': 0.75,
  },
}

const transitStationLayer = {
  id: 'transit-stations',
  type: 'circle' as const,
  source: 'transit-stations',
  paint: {
    'circle-color': '#22d3ee',
    'circle-radius': 3,
    'circle-opacity': 0.9,
    'circle-stroke-color': '#0f172a',
    'circle-stroke-width': 1,
  },
}

const MapViewMapbox = forwardRef<MapViewRef, MapViewProps>(function MapViewMapbox(
  {
    mapStyle,
    mapboxAccessToken,
    initialViewState,
    onMapClick,
    onMoveEnd,
    places,
    ghostLocation,
    onPlaceClick,
    isPlaceDimmed,
    isPlaceFocused,
    showTransit = false,
    showTransitStations = false,
    transitLinesUrl,
    transitStationsUrl,
  },
  ref
) {
  const showStations = showTransit && showTransitStations
  const transitLines = useGeoJson(transitLinesUrl, showTransit)
  const transitStations = useGeoJson(transitStationsUrl, showStations)

  return (
    <MapGL
      ref={ref}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={onMapClick}
      onMoveEnd={onMoveEnd}
    >
      {showTransit && transitLines ? (
        <Source
          id="transit-lines"
          type="geojson"
          data={transitLines as any}
        >
          <Layer {...transitLineLayer} />
        </Source>
      ) : null}
      {showStations && transitStations ? (
        <Source
          id="transit-stations"
          type="geojson"
          data={transitStations as any}
        >
          <Layer {...transitStationLayer} />
        </Source>
      ) : null}
      {ghostLocation ? (
        <Marker
          longitude={ghostLocation.lng}
          latitude={ghostLocation.lat}
        >
          <button
            type="button"
            aria-label="Candidate pin"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            className="h-8 w-8 rounded-full border-2 border-black/50 bg-white/50 shadow-sm"
          />
        </Marker>
      ) : null}

      {places.map((place) => {
        const isFocusedMarker = isPlaceFocused(place)
        const isDimmedMarker = isPlaceDimmed(place)
        return (
          <Marker
            key={place.id}
            longitude={place.lng}
            latitude={place.lat}
          >
            <button
              type="button"
              className={`cursor-pointer transition-opacity ${
                isDimmedMarker ? 'opacity-30' : 'opacity-100'
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
                onPlaceClick(place.id)
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
  )
})

export default MapViewMapbox
