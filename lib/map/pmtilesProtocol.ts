'use client'

import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

type PmtilesGlobalState = typeof globalThis & {
  __acercaPmtilesProtocol?: Protocol
  __acercaPmtilesProtocolRegistered?: boolean
}

export function ensurePmtilesProtocolRegistered() {
  const state = globalThis as PmtilesGlobalState
  if (!state.__acercaPmtilesProtocol) {
    state.__acercaPmtilesProtocol = new Protocol()
  }
  if (state.__acercaPmtilesProtocolRegistered) {
    return
  }

  maplibregl.addProtocol('pmtiles', state.__acercaPmtilesProtocol.tile)
  state.__acercaPmtilesProtocolRegistered = true
}
