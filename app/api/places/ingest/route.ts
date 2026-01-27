import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGooglePlace,
  fetchWikipediaPages,
  fetchWikidataData,
  selectBestWikipediaMatch,
  findGooglePlaceIdFromText,
} from '@/lib/enrichment/sources'

function parsePlaceIdFromGoogleMapsUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const placeId =
      u.searchParams.get('place_id') ??
      u.searchParams.get('query_place_id') ??
      u.searchParams.get('q')
    if (placeId && placeId.startsWith('ChI')) return placeId
    return null
  } catch {
    return null
  }
}

function looksLikeGooglePlaceId(raw: string): boolean {
  const s = raw.trim()
  return s.startsWith('ChI') && s.length >= 20 && s.length <= 200
}

function toGeographyPointWkt(lat: number, lng: number): string {
  // PostgREST/PostGIS accepts EWKT for geography columns.
  return `SRID=4326;POINT(${lng} ${lat})`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      input?: string
      place_id?: string
      include_wikipedia?: boolean
    }

    const input = body.input?.trim()
    const includeWikipedia = body.include_wikipedia !== false

    let placeId = body.place_id?.trim() ?? null
    if (!placeId && input) {
      placeId =
        parsePlaceIdFromGoogleMapsUrl(input) ||
        (looksLikeGooglePlaceId(input) ? input : null)
    }

    if (!placeId && input) {
      const resolved = await findGooglePlaceIdFromText(input)
      placeId = resolved.placeId
    }

    if (!placeId) {
      return NextResponse.json(
        { error: 'Provide input (Google Maps URL, place_id, or name).' },
        { status: 400 }
      )
    }

    const googlePlaces = await fetchGooglePlace(placeId)

    const lat = googlePlaces.geometry?.location?.lat
    const lng = googlePlaces.geometry?.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Google Places response missing geometry.' },
        { status: 502 }
      )
    }

    let wikipedia: unknown = null
    let wikidata: unknown = null

    if (includeWikipedia) {
      const pages = await fetchWikipediaPages(lat, lng)
      const best = selectBestWikipediaMatch({
        placeName: googlePlaces.name,
        candidates: pages,
      })

      wikipedia = {
        geosearch: pages,
        bestMatch: best,
      }

      if (best?.title) {
        wikidata = await fetchWikidataData(best.title)
      }
    }

    const raw_payload = {
      ...googlePlaces,
      wikipedia,
      wikidata,
    }

    const { data: candidate, error } = await supabase
      .from('place_candidates')
      .insert({
        user_id: user.id,
        source: 'google',
        source_id: `google:${googlePlaces.place_id}`,
        raw_payload,
        name: googlePlaces.name,
        address: googlePlaces.formatted_address ?? null,
        location: toGeographyPointWkt(lat, lng),
        status: 'new',
      })
      .select('id, status, name, address, source, source_id, created_at')
      .single()

    if (error || !candidate) {
      return NextResponse.json(
        { error: error?.message || 'Failed to insert candidate.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      candidate,
      google_place_id: googlePlaces.place_id,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
