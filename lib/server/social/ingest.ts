import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { searchGooglePlaces } from '@/lib/enrichment/sources'
import { inferCategoryFromGoogleTypes } from '@/lib/places/infer-category-from-google-types'
import {
  parseSocialExtraction,
  socialExtractionSchema,
  type IngestSocialRequest,
} from '@/lib/social/extraction-contract'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { toGeographyPointWkt } from '@/lib/server/places/ingest-google-place'

const SYSTEM_PROMPT = `
You are analyzing a transcript from social media content about travel.
Extract the author's persona and all specific places mentioned.
For each place, include the exact quote/context and classify sentiment.
Only include real, specific establishments - not generic references like "a cafe" or "the beach".
Persona values must be exactly one of: local, luxury, budget, design, foodie, adventure, family, nightlife.
`.trim()

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
})

type IngestFailure = {
  place_name: string
  reason: string
}

export type IngestSocialResult = {
  source_id: string
  places_resolved: number
  places_failed: number
  failures: IngestFailure[]
  error?: string
}

function requireSocialSystemUserId(): string {
  const userId = process.env.SOCIAL_SYSTEM_USER_ID?.trim()
  if (!userId) {
    throw new Error('Missing SOCIAL_SYSTEM_USER_ID')
  }
  return userId
}

async function ensureSourceId(params: {
  request: IngestSocialRequest
  authorPersona: string
}): Promise<string> {
  const supabase = getAdminSupabase()
  const { request, authorPersona } = params

  const upsertResult = await supabase
    .from('social_sources')
    .upsert(
      {
        url: request.url,
        platform: request.platform,
        author_name: request.author_name,
        author_persona: authorPersona,
        title: request.title ?? null,
        raw_transcript: request.transcript,
      },
      { onConflict: 'url' }
    )
    .select('id')
    .single()

  if (upsertResult.error || !upsertResult.data?.id) {
    throw new Error(
      `social_sources_upsert_failed:${upsertResult.error?.message ?? 'missing_source_id'}`
    )
  }

  return upsertResult.data.id
}

async function ensurePlaceId(params: {
  sourceUserId: string
  googlePlaceId: string
  name: string
  lat: number
  lng: number
  googleTypes?: string[]
}): Promise<string> {
  const supabase = getAdminSupabase()
  const { sourceUserId, googlePlaceId, name, lat, lng, googleTypes } = params

  const upsertResult = await supabase
    .from('places')
    .upsert(
      {
        user_id: sourceUserId,
        name,
        category: googleTypes?.length ? inferCategoryFromGoogleTypes(googleTypes) : 'Sights',
        source: 'social',
        source_id: `google:${googlePlaceId}`,
        google_place_id: googlePlaceId,
        dedupe_key: `google:${googlePlaceId}`,
        enrichment_source_hash: 'social-ingest',
        location: toGeographyPointWkt(lat, lng),
      },
      {
        onConflict: 'user_id,source,source_id',
        ignoreDuplicates: true,
      }
    )
    .select('id')
    .maybeSingle()

  if (upsertResult.error) {
    throw new Error(`places_upsert_failed:${upsertResult.error.message}`)
  }

  if (upsertResult.data?.id) return upsertResult.data.id

  const lookup = await supabase
    .from('places')
    .select('id')
    .eq('user_id', sourceUserId)
    .eq('source', 'social')
    .eq('source_id', `google:${googlePlaceId}`)
    .maybeSingle()

  if (lookup.error || !lookup.data?.id) {
    throw new Error(`places_lookup_failed:${lookup.error?.message ?? 'missing_place_id'}`)
  }

  return lookup.data.id
}

export async function ingestSocialSource(
  request: IngestSocialRequest
): Promise<IngestSocialResult> {
  try {
    const generated = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: socialExtractionSchema,
      system: SYSTEM_PROMPT,
      prompt: request.transcript,
      temperature: 0,
    })

    const extractionParsed = parseSocialExtraction(generated.object)
    if (!extractionParsed.ok) {
      throw new Error(`social_extraction_invalid:${extractionParsed.message}`)
    }
    const extraction = extractionParsed.data

    const sourceId = await ensureSourceId({
      request,
      authorPersona: extraction.author_persona,
    })

    const sourceUserId = requireSocialSystemUserId()
    const supabase = getAdminSupabase()
    const failures: IngestFailure[] = []
    let placesResolved = 0

    for (const mention of extraction.mentioned_places) {
      try {
        const searchQuery = mention.place_type
          ? `${mention.place_name} ${mention.place_type}`
          : mention.place_name

        const matches = await searchGooglePlaces(searchQuery, {
          locationBias:
            typeof request.location_hint?.lat === 'number' &&
            typeof request.location_hint?.lng === 'number'
              ? {
                  lat: request.location_hint.lat,
                  lng: request.location_hint.lng,
                  radiusMeters: 50_000,
                }
              : undefined,
        })

        const top = matches[0]
        const googlePlaceId = top?.place_id
        const lat = top?.geometry?.location?.lat
        const lng = top?.geometry?.location?.lng

        if (!googlePlaceId || typeof lat !== 'number' || typeof lng !== 'number') {
          failures.push({
            place_name: mention.place_name,
            reason: 'no_google_match',
          })
          continue
        }

        const placeId = await ensurePlaceId({
          sourceUserId,
          googlePlaceId,
          name: top.name?.trim() || mention.place_name,
          lat,
          lng,
          googleTypes: Array.isArray(top.types) ? (top.types as string[]) : undefined,
        })

        const mentionInsert = await supabase.from('social_mentions').insert(
          {
            source_id: sourceId,
            place_id: placeId,
            snippet: mention.context_snippet,
            sentiment: mention.sentiment,
          },
          { onConflict: 'source_id,place_id', ignoreDuplicates: true }
        )

        if (mentionInsert.error) {
          throw new Error(`social_mentions_insert_failed:${mentionInsert.error.message}`)
        }

        placesResolved += 1
      } catch (error) {
        failures.push({
          place_name: mention.place_name,
          reason: error instanceof Error ? error.message : 'place_resolution_failed',
        })
      }
    }

    return {
      source_id: sourceId,
      places_resolved: placesResolved,
      places_failed: failures.length,
      failures,
    }
  } catch (error) {
    return {
      source_id: '',
      places_resolved: 0,
      places_failed: 0,
      failures: [],
      error: error instanceof Error ? error.message : 'ingest_social_failed',
    }
  }
}
