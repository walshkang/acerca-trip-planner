'use client'

import { forwardRef } from 'react'
import MapGL, { Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getCategoryIcon } from '@/lib/icons/mapping'
import { PLACE_ICON_GLOW } from '@/lib/ui/glow'
import type { MapViewProps, MapViewRef } from './MapView.types'

const MapViewMaplibre = forwardRef<MapViewRef, MapViewProps>(
  function MapViewMaplibre(
    {
      mapStyle,
      initialViewState,
      onMapClick,
      onMoveEnd,
      places,
      ghostLocation,
      onPlaceClick,
      isPlaceDimmed,
      isPlaceFocused,
    },
    ref
  ) {
    return (
      <MapGL
        ref={ref}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onClick={onMapClick}
        onMoveEnd={onMoveEnd}
      >
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
  }
)

export default MapViewMaplibre
