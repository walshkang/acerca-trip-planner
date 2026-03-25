import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  findGooglePlaceIdFromText,
} from '@/lib/enrichment/sources'
import {
  looksLikeGooglePlaceId,
  parsePlaceIdFromGoogleMapsUrl,
} from '@/lib/places/google-place-input'
import {
  IngestGooglePlaceError,
  ingestGooglePlaceAsCandidate,
} from '@/lib/server/places/ingest-google-place'

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
      schema_version?: number
    }

    const input = body.input?.trim()
    const includeWikipedia = body.include_wikipedia !== false
    const schemaVersion = Number.isFinite(body.schema_version)
      ? Number(body.schema_version)
      : 2

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

    let result
    try {
      result = await ingestGooglePlaceAsCandidate({
        supabase,
        userId: user.id,
        googlePlaceId: placeId,
        includeWikipedia,
        schemaVersion,
      })
    } catch (e) {
      if (e instanceof IngestGooglePlaceError) {
        if (e.code === 'missing_geometry') {
          return NextResponse.json({ error: e.message }, { status: 502 })
        }
        return NextResponse.json(
          { error: e.message },
          { status: 500 }
        )
      }
      throw e
    }

    const { candidate, googlePlaces, enrichment, lat, lng } = result

    return NextResponse.json({
      candidate,
      google_place_id: googlePlaces.place_id,
      location: { lat, lng },
      google: {
        website: googlePlaces.website ?? null,
        url: googlePlaces.url ?? null,
        types: Array.isArray(googlePlaces.types)
          ? (googlePlaces.types.filter((t) => typeof t === 'string') as string[])
          : null,
        opening_hours: googlePlaces.opening_hours
          ? {
              open_now:
                typeof (googlePlaces.opening_hours as { open_now?: boolean })
                  ?.open_now === 'boolean'
                  ? (googlePlaces.opening_hours as { open_now: boolean }).open_now
                  : null,
              weekday_text: Array.isArray(
                (googlePlaces.opening_hours as { weekday_text?: unknown })
                  ?.weekday_text
              )
                ? (
                    googlePlaces.opening_hours as { weekday_text: unknown[] }
                  ).weekday_text.filter((v: unknown) => typeof v === 'string')
                : null,
            }
          : null,
      },
      enrichment: {
        curatedData: enrichment.curatedData,
        normalizedData: enrichment.normalizedData,
        sourceHash: enrichment.sourceHash,
        model: enrichment.model,
        temperature: enrichment.temperature,
        promptVersion: enrichment.promptVersion,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
