import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { DEFAULT_ROUTE_COLOR, gridKey } from '@/lib/transit/metroArea'

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

type GeoJsonFeature = {
  type: 'Feature'
  geometry: RouteGeometry
  properties: {
    route_short_name: string
    route_color: string
    route_type: 0 | 1 | 2 | 3
  }
}

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

const TRANSIT_CACHE_BUCKET = 'transit-cache'

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

  const cachePath = `${gridKey(lat, lng)}.geojson`

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
      ) ?? null) as GeoJsonFeatureCollection | null
      if (cachedValue?.type === 'FeatureCollection') {
        return geoJsonResponse(cachedValue)
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
    return new NextResponse(null, { status: 204 })
  }

  const featureCollection: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: payload.features.map((feature) => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        route_short_name: feature.properties.route_short_name,
        route_color: feature.properties.route_color ?? DEFAULT_ROUTE_COLOR,
        route_type: feature.properties.route_type as 0 | 1 | 2 | 3,
      },
    })),
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
