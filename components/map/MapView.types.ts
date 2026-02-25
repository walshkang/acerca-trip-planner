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
  showTransitStations?: boolean
  transitLinesUrl?: string
  transitStationsUrl?: string
  transitBeforeId?: string
  transitBeforeIdCandidates?: string[]
  transitLineWidth?: number
  transitLineOpacity?: number
  transitCasingWidth?: number
  transitCasingColor?: string
  transitCasingOpacity?: number
  showNeighborhoodBoundaries?: boolean
  neighborhoodBoundariesUrl?: string
  neighborhoodLabelsUrl?: string
  neighborhoodBeforeId?: string
  neighborhoodBeforeIdCandidates?: string[]
  neighborhoodFillColor?: string
  neighborhoodFillOpacity?: number
  neighborhoodOutlineColor?: string
  neighborhoodOutlineOpacity?: number
  neighborhoodOutlineWidth?: number
  showNeighborhoodLabels?: boolean
  neighborhoodLabelMinZoom?: number
  neighborhoodLabelColor?: string
  neighborhoodLabelOpacity?: number
  neighborhoodLabelHaloColor?: string
  neighborhoodLabelHaloWidth?: number
  markerBackdropClassName?: string
  styleKey?: string
  onMapError?: (error: unknown) => void
}
