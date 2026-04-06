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

type SocialMentionRow = {
  snippet: string
  sentiment: string | null
  social_sources: {
    author_name: string
    platform: string
    author_persona: string
    url: string
    title: string | null
  } | null
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
        'id, user_id, name, address, category, energy, opening_hours, enrichment_id, user_notes, user_tags, enriched_at, enrichment_version, source'
      )
      .eq('id', params.id)
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
    if (place.user_id !== user.id && place.source !== 'social') {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const { user_id: _placeUserId, ...placePayload } = place

    const enrichment =
      typeof placePayload.enrichment_id === 'string'
        ? await getEnrichmentById(placePayload.enrichment_id)
        : null

    const google = enrichment ? pickGoogleDetails(enrichment.raw_sources) : null

    let socialMentions: SocialMentionRow[] | null = null
    if (placePayload.source === 'social') {
      const { data: mentions } = await supabase
        .from('social_mentions')
        .select(
          `
            snippet,
            sentiment,
            social_sources (
              author_name,
              platform,
              author_persona,
              url,
              title
            )
          `
        )
        .eq('place_id', place.id)
        .order('created_at', { ascending: false })
        .limit(10)

      socialMentions = (mentions as SocialMentionRow[] | null) ?? null
    }

    return NextResponse.json({
      place: placePayload,
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
      social_mentions: socialMentions,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
