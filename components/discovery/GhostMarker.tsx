'use client'

import { Marker } from 'react-map-gl/mapbox'

export default function GhostMarker(props: {
  lng: number
  lat: number
  onClick?: () => void
}) {
  return (
    <Marker longitude={props.lng} latitude={props.lat}>
      <button
        type="button"
        aria-label="Candidate pin"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          props.onClick?.()
        }}
        className="h-8 w-8 rounded-full border-2 border-black/50 bg-white/50 shadow-sm"
      />
    </Marker>
  )
}

