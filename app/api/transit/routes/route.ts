import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { GeoJsonFeatureCollection } from '@/components/map/MapView.types'
import {
  DEFAULT_ROUTE_COLOR,
  citySlugForGrid,
  gridKey,
  normalizeMode,
} from '@/lib/transit/metroArea'
import { fetchOsmTransit } from '@/lib/transit/osm'

type RouteGeometry = {
  type: 'MultiLineString'
  coordinates: number[][][]
}

type TransitlandFeatureProperties = {
  route_short_name: string
  route_color: string | null
  route_type: number
  [key: string]: unknown
}

type TransitlandFeature = {
  type: 'Feature'
  geometry: RouteGeometry
  properties: TransitlandFeatureProperties
}

type TransitlandGeoJsonResponse = {
  features?: TransitlandFeature[]
}

const TRANSIT_CACHE_BUCKET = 'transit-cache'
const TRANSIT_MANUAL_BUCKET = 'transit-manual'
const CACHE_PATH_PREFIX = 'v2/'

function parseCoordinate(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function geoJsonResponse(featureCollection: GeoJsonFeatureCollection): NextResponse {
  return new NextResponse(JSON.stringify(featureCollection), {
    status: 200,
    headers: { 'Content-Type': 'application/geo+json' },
  })
}

function isCacheMiss(error: { statusCode?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.statusCode === '404' ||
    error.statusCode === '400' ||
    error.message?.toLowerCase().includes('not found') === true
  )
}

function hasCanonicalModeOnFeatures(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const fc = value as { type?: unknown; features?: unknown }
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) return false
  for (const f of fc.features) {
    if (!f || typeof f !== 'object') return false
    const props = (f as { properties?: unknown }).properties
    if (!props || typeof props !== 'object') return false
    const cm = (props as { canonical_mode?: unknown }).canonical_mode
    if (typeof cm !== 'string' || cm.length === 0) return false
  }
  return true
}

const USEFUL_TRANSIT_MODES = new Set(['subway', 'rail', 'tram', 'light_rail'])

function hasUsefulTransitModes(fc: GeoJsonFeatureCollection): boolean {
  return fc.features.some((f) => USEFUL_TRANSIT_MODES.has(f.properties.canonical_mode))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseCoordinate(searchParams.get('lat'))
  const lng = parseCoordinate(searchParams.get('lng'))

  if (lat === null || lng === null) {
    return NextResponse.json(
      { error: 'Missing or invalid lat/lng query params.' },
      { status: 400 }
    )
  }

  const cachePath = `${CACHE_PATH_PREFIX}${gridKey(lat, lng)}.geojson`

  // --- Tier 1: Manual override ---
  const citySlug = citySlugForGrid(gridKey(lat, lng))
  if (citySlug) {
    try {
      const supabase = getAdminSupabase()
      const { data: manualData, error: manualError } = await supabase.storage
        .from(TRANSIT_MANUAL_BUCKET)
        .download(`${citySlug}.geojson`)

      if (!manualError && manualData) {
        const parsed = (JSON.parse(await manualData.text()) ?? null) as unknown
        if (hasCanonicalModeOnFeatures(parsed)) {
          return geoJsonResponse(parsed as GeoJsonFeatureCollection)
        }
      }
    } catch (err) {
      console.warn('Transit manual override lookup failed:', err)
    }
  }
  // --- End Tier 1 ---

  try {
    const supabase = getAdminSupabase()
    const { data, error } = await supabase.storage
      .from(TRANSIT_CACHE_BUCKET)
      .download(cachePath)

    if (error && !isCacheMiss(error)) {
      console.warn('Transit cache download failed:', error)
    } else if (data) {
      const cachedValue = (JSON.parse(
        await data.text()
      ) ?? null) as unknown
      if (hasCanonicalModeOnFeatures(cachedValue)) {
        return geoJsonResponse(cachedValue as GeoJsonFeatureCollection)
      }
    }
  } catch (error) {
    console.warn('Transit cache download threw:', error)
  }

  const transitlandApiKey = process.env.TRANSITLAND_API_KEY
  if (!transitlandApiKey) {
    return new NextResponse(null, { status: 204 })
  }

  let payload: TransitlandGeoJsonResponse
  try {
    const params = new URLSearchParams({
      lon: String(lng),
      lat: String(lat),
      radius: '25000',
      limit: '1000',
      format: 'geojson',
    })

    const response = await fetch(
      `https://transit.land/api/v2/rest/routes?${params.toString()}`,
      {
        headers: { apikey: transitlandApiKey },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return new NextResponse(null, { status: 204 })
    }

    payload = (await response.json()) as TransitlandGeoJsonResponse
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  if (!payload.features?.length) {
    const osmResult = await fetchOsmTransit(lat, lng)
    if (osmResult) {
      try {
        const supabase = getAdminSupabase()
        await supabase.storage.from(TRANSIT_CACHE_BUCKET).upload(cachePath, JSON.stringify(osmResult), {
          upsert: true,
          contentType: 'application/geo+json',
        })
      } catch (err) {
        console.warn('Transit OSM cache upload failed:', err)
      }
      return geoJsonResponse(osmResult)
    }
    return new NextResponse(null, { status: 204 })
  }

  const featureCollection: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: payload.features.map((feature) => {
      const routeType = feature.properties.route_type
      const canonical = normalizeMode(
        typeof routeType === 'number' ? routeType : Number.NaN
      )
      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          route_short_name: feature.properties.route_short_name,
          route_color: feature.properties.route_color ?? DEFAULT_ROUTE_COLOR,
          route_type: typeof routeType === 'number' ? routeType : 0,
          canonical_mode: canonical,
        },
      }
    }),
  }

  if (!hasUsefulTransitModes(featureCollection)) {
    const osmResult = await fetchOsmTransit(lat, lng)
    if (osmResult) {
      try {
        const supabase = getAdminSupabase()
        await supabase.storage.from(TRANSIT_CACHE_BUCKET).upload(cachePath, JSON.stringify(osmResult), {
          upsert: true,
          contentType: 'application/geo+json',
        })
      } catch (err) {
        console.warn('Transit OSM (useful-mode miss) cache upload failed:', err)
      }
      return geoJsonResponse(osmResult)
    }
    return new NextResponse(null, { status: 204 })
  }

  try {
    const supabase = getAdminSupabase()
    const { error } = await supabase.storage
      .from(TRANSIT_CACHE_BUCKET)
      .upload(cachePath, JSON.stringify(featureCollection), {
        upsert: true,
        contentType: 'application/geo+json',
      })
    if (error) {
      console.warn('Transit cache upload failed:', error)
    }
  } catch (error) {
    console.warn('Transit cache upload threw:', error)
  }

  return geoJsonResponse(featureCollection)
}
