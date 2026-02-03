'use client'

import { forwardRef, useEffect, useState } from 'react'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getCategoryEmoji } from '@/lib/icons/mapping'
import { PLACE_FOCUS_GLOW } from '@/lib/ui/glow'
import type { MapViewProps, MapViewRef } from './MapView.types'
import { useGeoJson } from './useGeoJson'

const transitLineColors = [
  'match',
  ['get', 'LINE'],
  '8TH AVE LINE',
  '#0039a6',
  'ARCHER AVE LINE',
  '#0039a6',
  'FULTON ST LINE',
  '#0039a6',
  'QUEENS BLVD LINE',
  '#0039a6',
  'ROCKAWAY LINE',
  '#0039a6',
  'STATEN ISLAND RWY LINE',
  '#0039a6',
  '6TH AVE LINE',
  '#ff6319',
  '63RD ST LINE',
  '#ff6319',
  'BRIGHTON/CULVER LINE',
  '#ff6319',
  'CULVER/6TH AVE LINE',
  '#ff6319',
  'CONCOURSE LINE',
  '#ff6319',
  'CROSSTOWN LINE',
  '#6cbe45',
  '14ST/CANARSIE LINE',
  '#a7a9ac',
  '4TH AVE LINE',
  '#fccc0a',
  'ASTORIA LINE',
  '#fccc0a',
  'ASTORIA/QUEENS LINE',
  '#fccc0a',
  'BRIGHTON LINE',
  '#fccc0a',
  'MANHATTAN BRIDGE LINE',
  '#fccc0a',
  'NASSAU ST LINE',
  '#996633',
  'HOUSTON/ESSEX ST LINE',
  '#996633',
  'JAMAICA LINE',
  '#996633',
  'MYRTLE AVE LINE',
  '#996633',
  'BROADWAY LINE',
  '#fccc0a',
  'SEA BEACH LINE',
  '#fccc0a',
  'WEST END/SEA BEACH LINE',
  '#fccc0a',
  'BROADWAY/7TH AVE LINE',
  '#ee352e',
  'CLARK ST LINE',
  '#ee352e',
  'EASTERN PKY LINE',
  '#ee352e',
  'LENOX AVE LINE',
  '#ee352e',
  'NEW LOTS LINE',
  '#ee352e',
  'NOSTRAND AVE LINE',
  '#ee352e',
  'LEXINGTON AVE',
  '#00933c',
  'LEXINGTON AVE LINE',
  '#00933c',
  'LEXINGTON AVENUE LINE',
  '#00933c',
  'DYRE AVE LINE',
  '#00933c',
  'JEROME AVE LINE',
  '#00933c',
  'PELHAM LINE',
  '#00933c',
  'WHITE PLAINS RD LINE',
  '#00933c',
  'FLUSHING LINE',
  '#b933ad',
  'FLUSHING/ASTORIA LINE',
  '#b933ad',
  'SECOND AVENUE LINE',
  '#00add0',
  '2ND AVE LINE',
  '#00add0',
  '42ND ST SHUTTLE LINE',
  '#808183',
  'FRANKLIN AVE SHUTTLE LINE',
  '#808183',
  'INTERBOROUGH YARD',
  '#808183',
  'WEST END LINE',
  '#ff6319',
  'CULVER LINE',
  '#ff6319',
  '#94a3b8',
] as const

const buildTransitLineLayer = (lineWidth: number, lineOpacity: number) => ({
  id: 'transit-lines',
  type: 'line' as const,
  source: 'transit-lines',
  layout: {
    'line-join': 'round' as const,
    'line-cap': 'round' as const,
  },
  paint: {
    'line-color': transitLineColors,
    'line-width': lineWidth,
    'line-opacity': lineOpacity,
  },
})

const buildTransitLineCasingLayer = (
  casingColor: string,
  casingWidth: number,
  casingOpacity: number
) => ({
  id: 'transit-lines-casing',
  type: 'line' as const,
  source: 'transit-lines',
  layout: {
    'line-join': 'round' as const,
    'line-cap': 'round' as const,
  },
  paint: {
    'line-color': casingColor,
    'line-width': casingWidth,
    'line-opacity': casingOpacity,
  },
})

const buildNeighborhoodFillLayer = (
  fillColor: string,
  fillOpacity: number
) => ({
  id: 'neighborhood-boundaries-fill',
  type: 'fill' as const,
  source: 'neighborhood-boundaries',
  paint: {
    'fill-color': fillColor,
    'fill-opacity': fillOpacity,
  },
})

const buildNeighborhoodOutlineLayer = (
  outlineColor: string,
  outlineOpacity: number,
  outlineWidth: number
) => ({
  id: 'neighborhood-boundaries-outline',
  type: 'line' as const,
  source: 'neighborhood-boundaries',
  layout: {
    'line-join': 'round' as const,
    'line-cap': 'round' as const,
  },
  paint: {
    'line-color': outlineColor,
    'line-opacity': outlineOpacity,
    'line-width': outlineWidth,
  },
})

const buildNeighborhoodLabelLayer = (
  minZoom: number,
  labelColor: string,
  labelOpacity: number,
  haloColor: string,
  haloWidth: number
) => ({
  id: 'neighborhood-boundaries-labels',
  type: 'symbol' as const,
  source: 'neighborhood-labels',
  minzoom: minZoom,
  layout: {
    'text-field': ['coalesce', ['get', 'name'], ['get', 'ntaname']],
    'text-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      minZoom,
      10,
      minZoom + 2,
      12,
      minZoom + 4,
      14,
    ],
    'text-allow-overlap': false,
    'text-ignore-placement': false,
    'symbol-placement': 'point' as const,
  },
  paint: {
    'text-color': labelColor,
    'text-opacity': labelOpacity,
    'text-halo-color': haloColor,
    'text-halo-width': haloWidth,
  },
})

const transitStationLayer = {
  id: 'transit-stations',
  type: 'circle' as const,
  source: 'transit-stations',
  paint: {
    'circle-color': transitLineColors,
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
    transitBeforeId,
    transitLineWidth = 2.5,
    transitLineOpacity = 0.75,
    transitCasingWidth = 4,
    transitCasingColor = '#0f172a',
    transitCasingOpacity = 0.25,
    showNeighborhoodBoundaries = false,
    neighborhoodBoundariesUrl,
    neighborhoodLabelsUrl,
    neighborhoodBeforeId,
    neighborhoodFillColor = '#64748b',
    neighborhoodFillOpacity = 0.08,
    neighborhoodOutlineColor = '#334155',
    neighborhoodOutlineOpacity = 0.25,
    neighborhoodOutlineWidth = 1.2,
    showNeighborhoodLabels = false,
    neighborhoodLabelMinZoom = 11.5,
    neighborhoodLabelColor = '#334155',
    neighborhoodLabelOpacity = 0.6,
    neighborhoodLabelHaloColor = '#f8fafc',
    neighborhoodLabelHaloWidth = 1.25,
    markerBackdropClassName = '',
    styleKey,
  },
  ref
) {
  const showStations = showTransit && showTransitStations
  const transitLines = useGeoJson(transitLinesUrl, showTransit)
  const transitStations = useGeoJson(transitStationsUrl, showStations)
  const neighborhoodBoundaries = useGeoJson(
    neighborhoodBoundariesUrl,
    showNeighborhoodBoundaries
  )
  const neighborhoodLabels = useGeoJson(
    neighborhoodLabelsUrl,
    showNeighborhoodLabels
  )
  const [styleReady, setStyleReady] = useState(false)
  const transitLinesKey = styleKey ? `transit-lines-${styleKey}` : 'transit-lines'
  const transitStationsKey = styleKey
    ? `transit-stations-${styleKey}`
    : 'transit-stations'
  const neighborhoodKey = styleKey
    ? `neighborhood-boundaries-${styleKey}`
    : 'neighborhood-boundaries'
  const transitLineLayer = buildTransitLineLayer(transitLineWidth, transitLineOpacity)
  const transitLineCasingLayer = buildTransitLineCasingLayer(
    transitCasingColor,
    transitCasingWidth,
    transitCasingOpacity
  )
  const neighborhoodFillLayer = buildNeighborhoodFillLayer(
    neighborhoodFillColor,
    neighborhoodFillOpacity
  )
  const neighborhoodOutlineLayer = buildNeighborhoodOutlineLayer(
    neighborhoodOutlineColor,
    neighborhoodOutlineOpacity,
    neighborhoodOutlineWidth
  )
  const neighborhoodLabelLayer = buildNeighborhoodLabelLayer(
    neighborhoodLabelMinZoom,
    neighborhoodLabelColor,
    neighborhoodLabelOpacity,
    neighborhoodLabelHaloColor,
    neighborhoodLabelHaloWidth
  )

  useEffect(() => {
    setStyleReady(false)
  }, [mapStyle])

  return (
    <MapGL
      ref={ref}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={onMapClick}
      onMoveEnd={onMoveEnd}
      onLoad={() => setStyleReady(true)}
      onStyleData={() => setStyleReady(true)}
    >
      {styleReady && showNeighborhoodBoundaries && neighborhoodBoundaries ? (
        <Source
          key={neighborhoodKey}
          id="neighborhood-boundaries"
          type="geojson"
          data={neighborhoodBoundaries as any}
        >
          <Layer
            key={`${neighborhoodKey}-fill`}
            {...neighborhoodFillLayer}
            beforeId={neighborhoodBeforeId}
          />
          <Layer
            key={`${neighborhoodKey}-outline`}
            {...neighborhoodOutlineLayer}
            beforeId={neighborhoodBeforeId}
          />
        </Source>
      ) : null}
      {styleReady && showNeighborhoodLabels && neighborhoodLabels ? (
        <Source
          key={`${neighborhoodKey}-labels`}
          id="neighborhood-labels"
          type="geojson"
          data={neighborhoodLabels as any}
        >
          <Layer
            key={`${neighborhoodKey}-labels-layer`}
            {...neighborhoodLabelLayer}
            beforeId={neighborhoodBeforeId}
          />
        </Source>
      ) : null}
      {styleReady && showTransit && transitLines ? (
        <Source
          key={transitLinesKey}
          id="transit-lines"
          type="geojson"
          data={transitLines as any}
        >
          <Layer
            key={`${transitLinesKey}-casing`}
            {...transitLineCasingLayer}
            beforeId={transitBeforeId}
          />
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
})

export default MapViewMapbox
