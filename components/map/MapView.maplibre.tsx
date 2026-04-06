'use client'

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import MapGL, { Layer, Marker, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getCategoryEmoji } from '@/lib/icons/mapping'
import {
  resolveOverlayBeforeId,
  type StyleLayerLike,
} from '@/lib/map/styleResolver'
import { ensurePmtilesProtocolRegistered } from '@/lib/map/pmtilesProtocol'
import {
  GHOST_MARKER_GLOW_PULSE_CLASS_LIGHT,
  PLACE_FOCUS_GLOW,
} from '@/lib/ui/glow'
import type { CanonicalMode } from '@/lib/transit/metroArea'
import type { TransitMode } from '@/lib/state/useMapLayerStore'
import type { MapViewProps, MapViewRef } from './MapView.types'
import { fallbackMarkerRingClass } from '@/components/map/placeMarkerRing'

/** Carto/OpenMapTiles `transportation` layer — `subclass` */
const TRANSIT_LINE_COLOR_SUBCLASS: unknown[] = [
  'match',
  ['get', 'subclass'],
  'subway',
  '#7B61A5',
  'light_rail',
  '#5A9B8F',
  'tram',
  '#5A9B8F',
  'rail',
  '#8B8B8B',
  'narrow_gauge',
  '#8B8B8B',
  'funicular',
  '#8B8B8B',
  'monorail',
  '#8B8B8B',
  '#94a3b8',
]

/** Protomaps `roads` layer — `pmap:kind` */
const TRANSIT_LINE_COLOR_PMAP_KIND: unknown[] = [
  'match',
  ['get', 'pmap:kind'],
  'subway',
  '#7B61A5',
  'light_rail',
  '#5A9B8F',
  'rail',
  '#8B8B8B',
  '#94a3b8',
]

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

const CANONICAL_MODES_BY_TRANSIT_MODE: Record<TransitMode, CanonicalMode[]> = {
  subway: ['subway', 'tram'],
  bus: ['bus'],
  rail: ['rail'],
  ferry: ['ferry'],
}

function buildGtfsCanonicalModeFilter(transitModes: TransitMode[] | undefined): unknown[] {
  if (transitModes == null || transitModes.length === 0) {
    return ['in', ['get', 'canonical_mode'], ['literal', ['subway']]]
  }
  const allowed = new Set<CanonicalMode>()
  for (const m of transitModes) {
    const list = CANONICAL_MODES_BY_TRANSIT_MODE[m]
    if (list) {
      for (const c of list) allowed.add(c)
    }
  }
  const sorted = [...allowed].sort()
  return ['in', ['get', 'canonical_mode'], ['literal', sorted]]
}

function buildBaseTileFilter(
  lineFilter: unknown[],
  colorField: string | undefined,
  transitModes: TransitMode[] | undefined
): unknown[] {
  if (!transitModes || transitModes.length === 0) return lineFilter

  // Bus and ferry exist only on GTFS layers; base vector tiles have no matching
  // subclasses — ferry (and bus) are no-ops here.

  const subwayValues = [
    'subway',
    'light_rail',
    'tram',
    'monorail',
    'funicular',
  ]
  const railValues = ['rail', 'narrow_gauge', 'service_rail']

  const allowed: string[] = []
  if (transitModes.includes('subway')) allowed.push(...subwayValues)
  if (transitModes.includes('rail')) allowed.push(...railValues)

  if (allowed.length === 0) return ['==', '1', '0']

  if (!colorField) return lineFilter

  return ['in', colorField, ...allowed]
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

function markerSizeClass(mentionCount?: number): string {
  if (mentionCount == null || mentionCount <= 1) return 'h-9 w-9'
  if (mentionCount <= 3) return 'h-11 w-11'
  return 'h-13 w-13'
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
      getPlaceMarkerVariant,
      getPlaceMarkerRingClassName,
      resolveCategoryEmoji,
      markerFocusClassName,
      ghostMarkerClassName,
      showTransit = false,
      transitModes,
      gtfsData,
      transitTileConfig,
      transitBeforeId,
      transitBeforeIdCandidates,
      markerBackdropClassName = '',
      styleKey,
      onMapError,
    },
    ref
  ) {
    ensurePmtilesProtocolRegistered()
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

    const transitLineColorExpression = useMemo(() => {
      if (transitTileConfig?.colorField === 'pmap:kind') {
        return TRANSIT_LINE_COLOR_PMAP_KIND
      }
      return TRANSIT_LINE_COLOR_SUBCLASS
    }, [transitTileConfig?.colorField])

    const gtfsCanonicalModeFilter = useMemo(
      () => buildGtfsCanonicalModeFilter(transitModes),
      [transitModes]
    )

    const baseTileFilter = useMemo(
      () =>
        buildBaseTileFilter(
          transitTileConfig?.lineFilter ?? [],
          transitTileConfig?.colorField,
          transitModes
        ),
      [transitTileConfig?.lineFilter, transitTileConfig?.colorField, transitModes]
    )

    return (
      <MapGL
        ref={ref as any}
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
        {styleReady && showTransit && transitTileConfig && !gtfsData ? (
          <Layer
            id="transit-lines"
            type="line"
            source={transitTileConfig.vectorSource}
            source-layer={transitTileConfig.lineSourceLayer}
            filter={baseTileFilter as any}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': transitLineColorExpression as any,
              ...(TRANSIT_LINE_PAINT_BASE as object),
            }}
            beforeId={resolvedTransitBeforeId}
          />
        ) : null}
        {/* Transit stops from vector tiles (if available) */}
        {styleReady &&
          showTransit &&
          transitTileConfig?.stopSourceLayer &&
          transitTileConfig?.stopFilter &&
          !gtfsData ? (
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
        {styleReady && showTransit && gtfsData && gtfsData.features.length > 0 ? (
          <>
            <Source id="gtfs-routes" type="geojson" data={gtfsData as any} />
            <Layer
              id="gtfs-transit-lines"
              type="line"
              source="gtfs-routes"
              filter={gtfsCanonicalModeFilter as any}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['concat', '#', ['get', 'route_color']],
                ...(TRANSIT_LINE_PAINT_BASE as object),
              }}
              beforeId={resolvedTransitBeforeId}
            />
          </>
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
          const ringClass =
            getPlaceMarkerRingClassName?.(place) ?? fallbackMarkerRingClass(markerVariant)
          const doneClass = markerVariant === 'done' ? 'opacity-60 grayscale' : ''
          const markerStateClassName = isFocusedMarker
            ? markerFocusClassName ?? PLACE_FOCUS_GLOW
            : `${ringClass} ${doneClass}`.trim()
          const socialMarkerRingClassName =
            place.mentionCount == null ? '' : 'ring-2 ring-amber-400/60'
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
                  className={`flex items-center justify-center rounded-full ${markerSizeClass(
                    place.mentionCount
                  )} ${markerBackdropClassName} ${socialMarkerRingClassName} ${markerStateClassName}`}
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
  }
)

export default MapViewMaplibre
