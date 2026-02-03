'use client'

import { forwardRef, useEffect, useState } from 'react'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getCategoryEmoji } from '@/lib/icons/mapping'
import { PLACE_FOCUS_GLOW } from '@/lib/ui/glow'
import type { MapViewProps, MapViewRef } from './MapView.types'
import { useGeoJson } from './useGeoJson'

const transitLineLayer = {
  id: 'transit-lines',
  type: 'line' as const,
  source: 'transit-lines',
  paint: {
    'line-color': [
      'match',
      ['get', 'LINE'],
      '8TH AVE LINE',
      '#0039a6',
      '6TH AVE LINE',
      '#ff6319',
      'CULVER/6TH AVE LINE',
      '#ff6319',
      'CROSSTOWN LINE',
      '#6cbe45',
      '14ST/CANARSIE LINE',
      '#a7a9ac',
      'NASSAU ST LINE',
      '#996633',
      'BROADWAY LINE',
      '#fccc0a',
      'BROADWAY/7TH AVE LINE',
      '#ee352e',
      'LEXINGTON AVE',
      '#00933c',
      'LEXINGTON AVE LINE',
      '#00933c',
      'LEXINGTON AVENUE LINE',
      '#00933c',
      'FLUSHING LINE',
      '#b933ad',
      'SECOND AVENUE LINE',
      '#00add0',
      '2ND AVE LINE',
      '#00add0',
      '42ND ST SHUTTLE LINE',
      '#808183',
      'FRANKLIN AVE SHUTTLE LINE',
      '#808183',
      '#94a3b8',
    ],
    'line-width': 2.5,
    'line-opacity': 0.75,
  },
}

const transitStationLayer = {
  id: 'transit-stations',
  type: 'circle' as const,
  source: 'transit-stations',
  paint: {
    'circle-color': [
      'match',
      ['get', 'LINE'],
      '8TH AVE LINE',
      '#0039a6',
      '6TH AVE LINE',
      '#ff6319',
      'CULVER/6TH AVE LINE',
      '#ff6319',
      'CROSSTOWN LINE',
      '#6cbe45',
      '14ST/CANARSIE LINE',
      '#a7a9ac',
      'NASSAU ST LINE',
      '#996633',
      'BROADWAY LINE',
      '#fccc0a',
      'BROADWAY/7TH AVE LINE',
      '#ee352e',
      'LEXINGTON AVE',
      '#00933c',
      'LEXINGTON AVE LINE',
      '#00933c',
      'LEXINGTON AVENUE LINE',
      '#00933c',
      'FLUSHING LINE',
      '#b933ad',
      'SECOND AVENUE LINE',
      '#00add0',
      '2ND AVE LINE',
      '#00add0',
      '42ND ST SHUTTLE LINE',
      '#808183',
      'FRANKLIN AVE SHUTTLE LINE',
      '#808183',
      '#94a3b8',
    ],
    'circle-radius': 3,
    'circle-opacity': 0.9,
    'circle-stroke-color': '#0f172a',
    'circle-stroke-width': 1,
  },
}

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
      showTransit = false,
      showTransitStations = false,
      transitLinesUrl,
      transitStationsUrl,
      transitBeforeId,
      markerBackdropClassName = '',
      styleKey,
    },
    ref
  ) {
    const showStations = showTransit && showTransitStations
    const transitLines = useGeoJson(transitLinesUrl, showTransit)
    const transitStations = useGeoJson(transitStationsUrl, showStations)
    const [styleReady, setStyleReady] = useState(false)
    const transitLinesKey = styleKey ? `transit-lines-${styleKey}` : 'transit-lines'
    const transitStationsKey = styleKey
      ? `transit-stations-${styleKey}`
      : 'transit-stations'

    useEffect(() => {
      setStyleReady(false)
    }, [mapStyle])

    return (
      <MapGL
        ref={ref}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onClick={onMapClick}
        onMoveEnd={onMoveEnd}
        onLoad={() => setStyleReady(true)}
        onStyleData={() => setStyleReady(true)}
      >
        {styleReady && showTransit && transitLines ? (
          <Source
            key={transitLinesKey}
            id="transit-lines"
            type="geojson"
            data={transitLines as any}
          >
            <Layer
              key={`${transitLinesKey}-layer`}
              {...transitLineLayer}
              beforeId={transitBeforeId}
            />
          </Source>
        ) : null}
        {styleReady && showStations && transitStations ? (
          <Source
            key={transitStationsKey}
            id="transit-stations"
            type="geojson"
            data={transitStations as any}
          >
            <Layer
              key={`${transitStationsKey}-layer`}
              {...transitStationLayer}
              beforeId={transitBeforeId}
            />
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
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${markerBackdropClassName} ${isFocusedMarker ? PLACE_FOCUS_GLOW : ''}`}
                >
                  <span className="text-[15px] leading-none">
                    {getCategoryEmoji(place.category)}
                  </span>
                </span>
              </button>
            </Marker>
          )
        })}
      </MapGL>
    )
  }
)

export default MapViewMaplibre
