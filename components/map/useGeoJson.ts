'use client'

import { useEffect, useMemo, useState } from 'react'

type FeatureCollection = {
  type: 'FeatureCollection'
  features: unknown[]
}

const cache = new Map<string, FeatureCollection>()
const inflight = new Map<string, Promise<FeatureCollection>>()

async function fetchGeoJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load GeoJSON (${res.status})`)
  }
  return (await res.json()) as FeatureCollection
}

export function useGeoJson(url: string | undefined, enabled: boolean) {
  const initial = useMemo(() => {
    if (!url) return null
    return cache.get(url) ?? null
  }, [url])
  const [data, setData] = useState<FeatureCollection | null>(initial)

  useEffect(() => {
    if (!enabled || !url) return
    const cached = cache.get(url)
    if (cached) {
      setData(cached)
      return
    }

    let cancelled = false
    const existing = inflight.get(url)
    const promise = existing ?? fetchGeoJson(url)
    if (!existing) {
      inflight.set(url, promise)
    }
    promise
      .then((json) => {
        cache.set(url, json)
        inflight.delete(url)
        if (!cancelled) setData(json)
      })
      .catch(() => {
        inflight.delete(url)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, url])

  return data
}
