'use client'

import type { ViewState, MapRef, ViewStateChangeEvent } from 'react-map-gl'
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

export type MapViewProps = {
  mapStyle: string
  mapboxAccessToken?: string
  initialViewState: ViewState
  onMapClick: () => void
  onMoveEnd: (event: ViewStateChangeEvent) => void
  places: MapPlace[]
  ghostLocation?: LatLng | null
  onPlaceClick: (placeId: string) => void
  isPlaceDimmed: (place: MapPlace) => boolean
  isPlaceFocused: (place: MapPlace) => boolean
  markerFocusClassName?: string
  ghostMarkerClassName?: string
  showTransit?: boolean
  showTransitStations?: boolean
  transitLinesUrl?: string
  transitStationsUrl?: string
  transitBeforeId?: string
  transitLineWidth?: number
  transitLineOpacity?: number
  transitCasingWidth?: number
  transitCasingColor?: string
  transitCasingOpacity?: number
  showNeighborhoodBoundaries?: boolean
  neighborhoodBoundariesUrl?: string
  neighborhoodLabelsUrl?: string
  neighborhoodBeforeId?: string
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
}

export type MapViewRef = MapRef
