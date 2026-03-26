'use client'

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import MapGL, { Layer, Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getCategoryEmoji } from '@/lib/icons/mapping'
import {
  resolveOverlayBeforeId,
  type StyleLayerLike,
} from '@/lib/map/styleResolver'
import {
  GHOST_MARKER_GLOW_PULSE_CLASS_LIGHT,
  PLACE_FOCUS_GLOW,
} from '@/lib/ui/glow'
import type { MapViewProps, MapViewRef } from './MapView.types'

/** Muted palette by Mapbox `type` (composite road layer) */
const TRANSIT_LINE_COLOR = [
  'match',
  ['get', 'type'],
  'subway',
  '#7B61A5',
  'rail',
  '#8B8B8B',
  'tram',
  '#5A9B8F',
  'light_rail',
  '#5A9B8F',
  'monorail',
  '#8B8B8B',
  'funicular',
  '#8B8B8B',
  'narrow_gauge',
  '#8B8B8B',
  '#94a3b8',
] as const

const TRANSIT_LINE_PAINT_BASE: Record<string, unknown> = {
  'line-width': [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    0.15,
    8,
    0.6,
    11,
    1.4,
    14,
    2.2,
    16,
    2.5,
  ],
  'line-opacity': [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    0.08,
    8,
    0.3,
    11,
    0.55,
    14,
    0.65,
    16,
    0.7,
  ],
}

const TRANSIT_STOPS_PAINT: Record<string, unknown> = {
  'circle-color': '#7B61A5',
  'circle-radius': [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    1.5,
    14,
    3,
    16,
    4,
  ],
  'circle-opacity': [
    'interpolate',
    ['linear'],
    ['zoom'],
    9,
    0,
    11,
    0.5,
    14,
    0.75,
    16,
    0.85,
  ],
  'circle-stroke-color': '#ffffff',
  'circle-stroke-width': 0.5,
}

function readStyleLayersFromMap(mapInstance: unknown): StyleLayerLike[] {
  if (!mapInstance || typeof mapInstance !== 'object') return []
  const style = (mapInstance as { getStyle?: () => { layers?: unknown } })
    .getStyle?.()
  if (!style || !Array.isArray(style.layers)) return []

  return style.layers
    .filter((layer): layer is StyleLayerLike => {
      return (
        Boolean(layer) &&
        typeof layer === 'object' &&
        typeof (layer as { id?: unknown }).id === 'string'
      )
    })
    .map((layer) => ({
      id: layer.id,
      type: layer.type,
      layout: layer.layout as Record<string, unknown> | undefined,
    }))
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
    getPlaceMarkerVariant,
    resolveCategoryEmoji,
    markerFocusClassName,
    ghostMarkerClassName,
    showTransit = false,
    transitTileConfig,
    transitBeforeId,
    transitBeforeIdCandidates,
    markerBackdropClassName = '',
    styleKey,
    onMapError,
  },
  ref
) {
  const [styleReady, setStyleReady] = useState(false)
  const [resolvedTransitBeforeId, setResolvedTransitBeforeId] = useState<
    string | undefined
  >(transitBeforeId)

  const transitCandidateKey = useMemo(
    () => (transitBeforeIdCandidates ?? []).join('|'),
    [transitBeforeIdCandidates]
  )

  const syncBeforeIdsFromStyle = useCallback(
    (mapInstance: unknown) => {
      const styleLayers = readStyleLayersFromMap(mapInstance)
      setResolvedTransitBeforeId(
        resolveOverlayBeforeId({
          layers: styleLayers,
          preferredId: transitBeforeId,
          candidates: transitBeforeIdCandidates,
        })
      )
    },
    [transitBeforeId, transitBeforeIdCandidates]
  )

  useEffect(() => {
    setStyleReady(false)
  }, [mapStyle])

  useEffect(() => {
    setResolvedTransitBeforeId(transitBeforeId)
  }, [mapStyle, transitBeforeId, transitCandidateKey])

  return (
    <MapGL
      ref={ref as any}
      mapboxAccessToken={mapboxAccessToken}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={onMapClick}
      onMoveEnd={onMoveEnd}
      onLoad={(event) => {
        setStyleReady(true)
        syncBeforeIdsFromStyle((event as { target?: unknown }).target)
      }}
      onStyleData={(event) => {
        setStyleReady(true)
        syncBeforeIdsFromStyle((event as { target?: unknown }).target)
      }}
      onError={(event) => {
        onMapError?.((event as { error?: unknown }).error ?? event)
      }}
    >
      {/* Transit lines from vector tiles */}
      {styleReady && showTransit && transitTileConfig ? (
        <Layer
          id="transit-lines"
          type="line"
          source={transitTileConfig.vectorSource}
          source-layer={transitTileConfig.lineSourceLayer}
          filter={transitTileConfig.lineFilter as any}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': TRANSIT_LINE_COLOR as any,
            ...(TRANSIT_LINE_PAINT_BASE as object),
          }}
          beforeId={resolvedTransitBeforeId}
        />
      ) : null}
      {/* Transit stops from vector tiles (if available) */}
      {styleReady &&
        showTransit &&
        transitTileConfig?.stopSourceLayer &&
        transitTileConfig?.stopFilter ? (
        <Layer
          id="transit-stops"
          type="circle"
          source={transitTileConfig.vectorSource}
          source-layer={transitTileConfig.stopSourceLayer}
          filter={transitTileConfig.stopFilter as any}
          paint={TRANSIT_STOPS_PAINT as any}
          beforeId={resolvedTransitBeforeId}
        />
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
            className={
              ghostMarkerClassName ??
              `h-9 w-9 rounded-full border-2 border-black/50 bg-white/50 shadow-sm ${GHOST_MARKER_GLOW_PULSE_CLASS_LIGHT}`
            }
          />
        </Marker>
      ) : null}

      {places.map((place) => {
        const isFocusedMarker = isPlaceFocused(place)
        const isDimmedMarker = isPlaceDimmed(place)
        const markerVariant = getPlaceMarkerVariant?.(place) ?? 'default'
        const markerVariantClassName =
          markerVariant === 'scheduled'
            ? 'ring-2 ring-emerald-500/70'
            : markerVariant === 'done'
              ? 'opacity-60 grayscale'
              : 'ring-2 ring-slate-400/50'
        const markerStateClassName = isFocusedMarker
          ? markerFocusClassName ?? PLACE_FOCUS_GLOW
          : markerVariantClassName
        return (
          <Marker
            key={place.id}
            longitude={place.lng}
            latitude={place.lat}
          >
            <button
              type="button"
              className={`cursor-pointer transition-all duration-150 hover:scale-105 ${
                isDimmedMarker ? 'opacity-30' : 'opacity-100'
              }`}
              data-marker-variant={markerVariant}
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
                className={`flex h-9 w-9 items-center justify-center rounded-full ${markerBackdropClassName} ${
                  markerStateClassName
                }`}
              >
                <span className="text-[18px] leading-none">
                  {resolveCategoryEmoji?.(place.category) ??
                    getCategoryEmoji(place.category)}
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
