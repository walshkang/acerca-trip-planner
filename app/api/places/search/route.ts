import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchGooglePlaces } from '@/lib/enrichment/sources'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 10
const DEFAULT_RADIUS_METERS = 20000
const MAX_RADIUS_METERS = 100000

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT)
}

function parseFloatParam(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRadius(value: string | null): number {
  if (!value) return DEFAULT_RADIUS_METERS
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS_METERS
  return Math.min(Math.max(parsed, 1000), MAX_RADIUS_METERS)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const rawQuery =
      url.searchParams.get('q') ??
      url.searchParams.get('query') ??
      url.searchParams.get('input') ??
      ''
    const query = rawQuery.trim()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const limit = parseLimit(url.searchParams.get('limit'))
    const lat = parseFloatParam(url.searchParams.get('lat'))
    const lng = parseFloatParam(url.searchParams.get('lng'))
    const radiusMeters = parseRadius(url.searchParams.get('radius_m'))
    const locationBias =
      lat != null && lng != null
        ? { locationBias: { lat, lng, radiusMeters } }
        : undefined

    const candidates = await searchGooglePlaces(query, locationBias)

    const results = candidates.slice(0, limit).map((candidate) => ({
      place_id: candidate.place_id,
      name: candidate.name ?? null,
      address: candidate.formatted_address ?? null,
    }))

    return NextResponse.json({ query, results })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
