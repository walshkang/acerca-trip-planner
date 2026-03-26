'use client'

import type { ViewState } from 'react-map-gl/maplibre'
import type { CategoryEnum } from '@/lib/types/enums'

export type MapPlace = {
  id: string
  name: string
  category: CategoryEnum
  lat: number
  lng: number
}

export type LatLng = {
  lat: number
  lng: number
}

export type PlaceMarkerVariant = 'default' | 'backlog' | 'scheduled' | 'done'

export type MapViewRef = {
  getBounds: () => {
    getCenter: () => LatLng
    getNorthEast: () => LatLng
  }
  getZoom: () => number
  flyTo: (options: unknown) => void
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: unknown
  ) => void
}

export type MapMoveEndEvent = {
  viewState: {
    longitude: number
    latitude: number
    zoom: number
    bearing?: number
    pitch?: number
  }
}

export type TransitTileConfig = {
  /** Vector tile source ID (e.g. 'composite' for Mapbox, 'carto' for Carto GL basemaps) */
  vectorSource: string
  /** Source-layer for transit lines (e.g. 'road' for Mapbox, 'transportation' for OpenMapTiles) */
  lineSourceLayer: string
  /** Filter for transit line features */
  lineFilter: unknown[]
  /** Source-layer for transit stops (optional — not all tile sets have this) */
  stopSourceLayer?: string
  /** Filter for transit stop features */
  stopFilter?: unknown[]
  /** Property name for the transit-type color match (e.g. 'subclass', 'pmap:kind', 'type') */
  colorField?: string
}

export type MapViewProps = {
  mapStyle: string
  mapboxAccessToken?: string
  initialViewState: ViewState
  onMapClick: () => void
  onMoveEnd: (event: MapMoveEndEvent) => void
  places: MapPlace[]
  ghostLocation?: LatLng | null
  onPlaceClick: (placeId: string) => void
  isPlaceDimmed: (place: MapPlace) => boolean
  isPlaceFocused: (place: MapPlace) => boolean
  getPlaceMarkerVariant?: (place: MapPlace) => PlaceMarkerVariant
  resolveCategoryEmoji?: (category: CategoryEnum) => string
  markerFocusClassName?: string
  ghostMarkerClassName?: string
  showTransit?: boolean
  transitTileConfig?: TransitTileConfig
  transitBeforeId?: string
  transitBeforeIdCandidates?: string[]
  markerBackdropClassName?: string
  styleKey?: string
  onMapError?: (error: unknown) => void
}
