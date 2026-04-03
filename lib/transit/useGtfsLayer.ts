'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GeoJsonFeatureCollection } from '@/components/map/MapView.types'
import { gridKey } from '@/lib/transit/metroArea'

const EMPTY_FEATURE_COLLECTION: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

const gtfsCache = new Map<string, GeoJsonFeatureCollection>()
const inFlightByGridKey = new Map<string, Promise<GeoJsonFeatureCollection>>()

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (!value || typeof value !== 'object') return false
  const maybeCollection = value as { type?: unknown; features?: unknown }
  return (
    maybeCollection.type === 'FeatureCollection' &&
    Array.isArray(maybeCollection.features)
  )
}

async function fetchGtfsLayer(
  center: { lat: number; lng: number },
  key: string
): Promise<GeoJsonFeatureCollection> {
  const existingRequest = inFlightByGridKey.get(key)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lng: String(center.lng),
      })
      const response = await fetch(`/api/transit/routes?${params.toString()}`)

      if (response.status === 204 || !response.ok) {
        gtfsCache.set(key, EMPTY_FEATURE_COLLECTION)
        return EMPTY_FEATURE_COLLECTION
      }

      const parsed = (await response.json()) as unknown
      if (isFeatureCollection(parsed)) {
        gtfsCache.set(key, parsed)
        return parsed
      }

      gtfsCache.set(key, EMPTY_FEATURE_COLLECTION)
      return EMPTY_FEATURE_COLLECTION
    } catch {
      gtfsCache.set(key, EMPTY_FEATURE_COLLECTION)
      return EMPTY_FEATURE_COLLECTION
    } finally {
      inFlightByGridKey.delete(key)
    }
  })()

  inFlightByGridKey.set(key, request)
  return request
}

export function useGtfsLayer(
  center: { lat: number; lng: number } | null,
  enabled: boolean
): GeoJsonFeatureCollection | null {
  const key = useMemo(
    () => (center ? gridKey(center.lat, center.lng) : null),
    [center?.lat, center?.lng]
  )
  const [data, setData] = useState<GeoJsonFeatureCollection | null>(null)

  useEffect(() => {
    let isCancelled = false

    if (!enabled || !center || !key) {
      setData(null)
      return () => {
        isCancelled = true
      }
    }

    const cached = gtfsCache.get(key)
    if (cached) {
      setData(cached)
      return () => {
        isCancelled = true
      }
    }

    setData(null)
    void fetchGtfsLayer(center, key).then((nextData) => {
      if (!isCancelled) {
        setData(nextData)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [enabled, center, key])

  return data
}
