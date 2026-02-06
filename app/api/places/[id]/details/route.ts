import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEnrichmentById } from '@/lib/server/places/getPlaceEnrichment'

type GoogleDetails = {
  formatted_address?: string
  formatted_phone_number?: string
  website?: string
  url?: string
  opening_hours?: unknown
}

function safeObject(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function pickGoogleDetails(rawSources: unknown): GoogleDetails | null {
  const raw = safeObject(rawSources)
  const google = raw ? safeObject(raw.googlePlaces) : null
  if (!google) return null

  const formatted_address =
    typeof google.formatted_address === 'string' ? google.formatted_address : undefined
  const formatted_phone_number =
    typeof google.formatted_phone_number === 'string'
      ? google.formatted_phone_number
      : undefined
  const website = typeof google.website === 'string' ? google.website : undefined
  const url = typeof google.url === 'string' ? google.url : undefined
  const opening_hours = google.opening_hours

  if (
    formatted_address === undefined &&
    formatted_phone_number === undefined &&
    website === undefined &&
    url === undefined &&
    opening_hours === undefined
  ) {
    return null
  }

  return { formatted_address, formatted_phone_number, website, url, opening_hours }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: place, error: placeError } = await supabase
      .from('places')
      .select(
        'id, name, address, category, energy, opening_hours, enrichment_id, user_notes, user_tags, enriched_at, enrichment_version'
      )
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (placeError || !place) {
      if (placeError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: placeError?.message || 'Place not found' },
        { status: 404 }
      )
    }

    const enrichment =
      typeof place.enrichment_id === 'string'
        ? await getEnrichmentById(place.enrichment_id)
        : null

    const google = enrichment ? pickGoogleDetails(enrichment.raw_sources) : null

    return NextResponse.json({
      place,
      enrichment: enrichment
        ? {
            curated_data: enrichment.curated_data ?? null,
            normalized_data: enrichment.normalized_data ?? null,
            raw_sources: {
              wikipediaCurated: safeObject(enrichment.raw_sources)?.wikipediaCurated ?? null,
              wikipediaSummary: safeObject(enrichment.raw_sources)?.wikipediaSummary ?? null,
            },
          }
        : null,
      google,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

