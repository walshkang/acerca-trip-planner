'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ViewState } from 'react-map-gl/maplibre'
import MapViewMapbox from '@/components/map/MapView.mapbox'
import MapViewMaplibre from '@/components/map/MapView.maplibre'
import type {
  MapPlace,
  MapViewRef,
  PlaceMarkerVariant,
} from '@/components/map/MapView.types'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import { resolveMapStyle, normalizeMaplibreStyleSource } from '@/lib/map/styleResolver'
import { boundsFromPlaces, boundsToArray } from '@/lib/map/bounds'
import type { TripListItem } from '@/lib/state/useTripStore'

export type MapInsetProps = {
  places: MapPlace[]
  activeListItems: TripListItem[]
  selectedDay: string | null
  onPinClick: (placeId: string) => void
  className?: string
}

const LIGHT_MARKER_BACKDROP =
  'bg-white/95 border-2 border-slate-900/30 shadow-[0_4px_12px_rgba(15,23,42,0.25),0_1px_3px_rgba(15,23,42,0.15)]'

/** Fit viewport to places: skip empty, single pin → flyTo, else fitBounds */
function fitMapToPlaceList(map: MapViewRef, selected: MapPlace[]) {
  if (!selected.length) return
  if (selected.length === 1) {
    const p = selected[0]
    map.flyTo({
      center: [p.lng, p.lat],
      zoom: Math.max(map.getZoom(), 13),
    })
    return
  }
  const bounds = boundsFromPlaces(selected)
  if (!bounds) return
  map.fitBounds(boundsToArray(bounds), { padding: 40, maxZoom: 15 })
}

export default function MapInset({
  places,
  activeListItems,
  selectedDay,
  onPinClick,
  className,
}: MapInsetProps) {
  const mapRef = useRef<MapViewRef>(null)
  const placesRef = useRef(places)
  placesRef.current = places
  const { resolveCategoryEmoji } = useCategoryIconOverrides()

  // Provider detection (matches MapShell)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapProvider =
    process.env.NEXT_PUBLIC_MAP_PROVIDER === 'mapbox' ? 'mapbox' : 'maplibre'
  const isMapbox = mapProvider === 'mapbox'
  const maplibreStyleSource = useMemo(
    () => normalizeMaplibreStyleSource(process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_SOURCE),
    []
  )

  const { mapStyle, styleKey } = useMemo(
    () =>
      resolveMapStyle({
        provider: mapProvider,
        tone: 'light',
        maplibreStyleSource,
      }),
    [mapProvider, maplibreStyleSource]
  )

  // Build lookup: placeId → item (for variant + dimming)
  const itemByPlaceId = useMemo(() => {
    const map = new Map<string, TripListItem>()
    for (const item of activeListItems) {
      map.set(item.place_id, item)
    }
    return map
  }, [activeListItems])

  // Variant: scheduled (green border), done (gray), backlog (none)
  const getPlaceMarkerVariant = useCallback(
    (place: MapPlace): PlaceMarkerVariant => {
      const item = itemByPlaceId.get(place.id)
      if (!item) return 'default'
      if (item.completed_at) return 'done'
      if (item.scheduled_date) return 'scheduled'
      return 'backlog'
    },
    [itemByPlaceId]
  )

  // Day-based dimming: when a day is selected, dim pins not on that day
  const isPlaceDimmed = useCallback(
    (place: MapPlace): boolean => {
      if (!selectedDay) return false
      const item = itemByPlaceId.get(place.id)
      if (!item) return true
      return item.scheduled_date !== selectedDay
    },
    [selectedDay, itemByPlaceId]
  )

  const isPlaceFocused = useCallback(() => false, [])

  // Initial view: fit to all places (ViewState must match react-map-gl / MapViewProps)
  const initialViewState = useMemo<ViewState>(() => {
    const padding = { top: 0, bottom: 0, left: 0, right: 0 }
    const bounds = boundsFromPlaces(places)
    if (bounds) {
      const centerLng = (bounds.sw.lng + bounds.ne.lng) / 2
      const centerLat = (bounds.sw.lat + bounds.ne.lat) / 2
      return {
        longitude: centerLng,
        latitude: centerLat,
        zoom: 12,
        bearing: 0,
        pitch: 0,
        padding,
      }
    }
    return {
      longitude: -73.98,
      latitude: 40.75,
      zoom: 11,
      bearing: 0,
      pitch: 0,
      padding,
    }
  }, [places])

  // Stable identity for list membership (active list / refetch)
  const placesKey = useMemo(
    () =>
      [...places]
        .map((p) => p.id)
        .sort()
        .join('\0'),
    [places]
  )

  // A: When list membership changes (e.g. list switch), fit all pins — uses places only, not items
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    fitMapToPlaceList(map, placesRef.current)
  }, [placesKey])

  // B: Narrow to selected day (runs after A in the same commit when both deps change)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!selectedDay) {
      fitMapToPlaceList(map, places)
      return
    }

    const dayPlaces = places.filter((p) => {
      const item = itemByPlaceId.get(p.id)
      return item?.scheduled_date === selectedDay
    })
    if (!dayPlaces.length) return
    fitMapToPlaceList(map, dayPlaces)
  }, [selectedDay, places, itemByPlaceId])

  // No-op handlers
  const noop = useCallback(() => {}, [])
  const noopMoveEnd = useCallback(() => {}, [])

  if (isMapbox && !mapboxToken) return null

  const MapView = isMapbox ? MapViewMapbox : MapViewMaplibre

  return (
    <div className={className ?? 'h-full w-full'}>
      <MapView
        ref={mapRef}
        mapStyle={mapStyle}
        mapboxAccessToken={isMapbox ? mapboxToken : undefined}
        initialViewState={initialViewState}
        places={places}
        onPlaceClick={onPinClick}
        onMapClick={noop}
        onMoveEnd={noopMoveEnd}
        isPlaceDimmed={isPlaceDimmed}
        isPlaceFocused={isPlaceFocused}
        getPlaceMarkerVariant={getPlaceMarkerVariant}
        resolveCategoryEmoji={resolveCategoryEmoji}
        markerBackdropClassName={LIGHT_MARKER_BACKDROP}
        styleKey={styleKey}
      />
    </div>
  )
}
