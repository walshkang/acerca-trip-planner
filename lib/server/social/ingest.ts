import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { Json } from '@/lib/supabase/types'
import { searchGooglePlaces } from '@/lib/enrichment/sources'
import { inferCategoryFromGoogleTypes } from '@/lib/places/infer-category-from-google-types'
import {
  parseSocialExtraction,
  parseSocialExtractionChunk,
  socialExtractionChunkSchema,
  socialExtractionSchema,
  type IngestSocialRequest,
  type MergedSocialExtraction,
  type Persona,
  type SocialExtractionChunk,
} from '@/lib/social/extraction-contract'
import {
  chunkTranscript,
  getChunkingConfigFromEnv,
  mergeSocialExtractions,
} from '@/lib/social/transcript-chunks'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { toGeographyPointWkt } from '@/lib/server/places/ingest-google-place'

const SYSTEM_PROMPT = `
You are analyzing a transcript from social media content about travel.
Extract the author's persona and all specific places mentioned.
For each place, include the exact quote/context and classify sentiment.
Only include real, specific establishments - not generic references like "a cafe" or "the beach".
Persona values must be exactly one of: local, luxury, budget, design, foodie, adventure, family, nightlife.
For each place also provide:
- tags: 1-4 short keyword labels capturing vibe, format, or notable attributes (e.g. "rooftop", "cash-only", "hidden gem", "outdoor seating"). Max 6 tags.
- callouts: specific named dishes, drinks, or activities mentioned in the context for this place (e.g. {type: "dish", text: "pad see ew"}, {type: "activity", text: "longtail boat ride"}). Only include callouts explicitly named in the transcript. Max 10 callouts per place.
`.trim()

const CHUNK_SYSTEM_PROMPT = `
You are analyzing ONE segment of a longer travel transcript.
Extract the author's persona (if inferable from this segment) and specific places mentioned in THIS segment only.
If this segment has no real, named establishments, set contains_places to false and mentioned_places to [].
Do not invent venues. Persona values must be exactly one of: local, luxury, budget, design, foodie, adventure, family, nightlife.
For each place, include the exact quote/context and classify sentiment.
Only include real, specific establishments - not generic references like "a cafe" or "the beach".
For each place also provide:
- tags: 1-4 short keyword labels capturing vibe, format, or notable attributes (e.g. "rooftop", "cash-only", "hidden gem", "outdoor seating"). Max 6 tags.
- callouts: specific named dishes, drinks, or activities mentioned in the context for this place (e.g. {type: "dish", text: "pad see ew"}, {type: "activity", text: "longtail boat ride"}). Only include callouts explicitly named in the transcript. Max 10 callouts per place.
`.trim()

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
})

export function getSocialExtractionModelId(): string {
  return process.env.SOCIAL_EXTRACTION_MODEL?.trim() || 'gemini-1.5-flash'
}

const GEMINI_BATCH_SIZE = 4

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

async function generateObjectWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      const is429 = msg.includes('429') || msg.includes('Too Many Requests')
      if (!is429 || attempt === 3) throw e
      await sleep(2 ** attempt * 400)
    }
  }
  throw lastErr
}

type IngestFailure = {
  place_name: string
  reason: string
}

type ExtractedMention = {
  place_name: string
  place_type?: string
  context_snippet: string
  sentiment: 'positive' | 'neutral' | 'mixed'
  tags?: string[]
  callouts?: Array<{ type: 'dish' | 'drink' | 'activity' | 'tip'; text: string }>
}

export type IngestSocialResult = {
  source_id: string
  places_resolved: number
  places_failed: number
  failures: IngestFailure[]
  error?: string
}

function extractedMentionKey(mention: ExtractedMention): string {
  const name = mention.place_name.trim().toLowerCase()
  const placeType = (mention.place_type ?? '').trim().toLowerCase()
  return `${name}::${placeType}`
}

function dedupeExtractedMentions(mentions: ExtractedMention[]): ExtractedMention[] {
  const seen = new Set<string>()
  const deduped: ExtractedMention[] = []
  for (const mention of mentions) {
    const key = extractedMentionKey(mention)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(mention)
  }
  return deduped
}

function requireSocialSystemUserId(): string {
  const userId = process.env.SOCIAL_SYSTEM_USER_ID?.trim()
  if (!userId) {
    throw new Error('Missing SOCIAL_SYSTEM_USER_ID')
  }
  return userId
}

async function extractMergedSocialExtraction(transcript: string): Promise<MergedSocialExtraction> {
  const { maxChars } = getChunkingConfigFromEnv()
  if (transcript.length <= maxChars) {
    const generated = await generateObjectWithRetry(() =>
      generateObject({
        model: google(getSocialExtractionModelId()),
        schema: socialExtractionSchema,
        system: SYSTEM_PROMPT,
        prompt: transcript,
        temperature: 0,
      })
    )
    const extractionParsed = parseSocialExtraction(generated.object)
    if (!extractionParsed.ok) {
      throw new Error(`social_extraction_invalid:${extractionParsed.message}`)
    }
    const data = extractionParsed.data
    return {
      author_persona: data.author_persona,
      mentioned_places: data.mentioned_places,
    }
  }

  const { maxChars: chunkMax, overlapChars } = getChunkingConfigFromEnv()
  const textChunks = chunkTranscript(transcript, { maxChars: chunkMax, overlapChars })
  const chunkOutputs: SocialExtractionChunk[] = []

  for (let i = 0; i < textChunks.length; i += GEMINI_BATCH_SIZE) {
    const batch = textChunks.slice(i, i + GEMINI_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((text) =>
        generateObjectWithRetry(() =>
          generateObject({
            model: google(getSocialExtractionModelId()),
            schema: socialExtractionChunkSchema,
            system: CHUNK_SYSTEM_PROMPT,
            prompt: text,
            temperature: 0,
          })
        ).then((generated) => {
          const extractionParsed = parseSocialExtractionChunk(generated.object)
          if (!extractionParsed.ok) {
            throw new Error(`social_extraction_chunk_invalid:${extractionParsed.message}`)
          }
          return extractionParsed.data
        })
      )
    )
    chunkOutputs.push(...batchResults)
  }

  return mergeSocialExtractions(chunkOutputs)
}

async function ensureSourceId(params: {
  request: IngestSocialRequest
  authorPersona: Persona
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
  googleRating?: number
  googleReviewCount?: number
}): Promise<string> {
  const supabase = getAdminSupabase()
  const {
    sourceUserId,
    googlePlaceId,
    name,
    lat,
    lng,
    googleTypes,
    googleRating,
    googleReviewCount,
  } = params

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
        google_rating: typeof googleRating === 'number' ? googleRating : null,
        google_review_count: typeof googleReviewCount === 'number' ? googleReviewCount : null,
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

/**
 * Core pipeline: LLM extraction → Google Places → social_sources / places / social_mentions.
 */
export async function persistSocialIngest(request: IngestSocialRequest): Promise<IngestSocialResult> {
  try {
    const extraction = await extractMergedSocialExtraction(request.transcript)

    const sourceId = await ensureSourceId({
      request,
      authorPersona: extraction.author_persona,
    })

    const sourceUserId = requireSocialSystemUserId()
    const supabase = getAdminSupabase()
    const failures: IngestFailure[] = []
    let placesResolved = 0
    const extractedMentions = dedupeExtractedMentions(
      extraction.mentioned_places as ExtractedMention[]
    )

    for (const mention of extractedMentions) {
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
          googleRating: typeof top.rating === 'number' ? top.rating : undefined,
          googleReviewCount:
            typeof top.user_ratings_total === 'number' ? top.user_ratings_total : undefined,
        })

        const mentionInsert = await supabase.from('social_mentions').upsert(
          {
            source_id: sourceId,
            place_id: placeId,
            snippet: mention.context_snippet,
            sentiment: mention.sentiment,
            tags: mention.tags ?? [],
            callouts: mention.callouts ? JSON.parse(JSON.stringify(mention.callouts)) : [],
          },
          { onConflict: 'source_id,place_id' }
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

    if (failures.length > 0) {
      console.warn('[social-ingest] mention failures', {
        source_id: sourceId,
        failures,
      })
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

export async function ingestSocialSource(request: IngestSocialRequest): Promise<IngestSocialResult> {
  return persistSocialIngest(request)
}

export async function persistSocialIngestForJob(
  request: IngestSocialRequest,
  jobId: string
): Promise<IngestSocialResult> {
  const result = await persistSocialIngest(request)
  const admin = getAdminSupabase()

  if (result.error) {
    await admin
      .from('social_ingest_jobs')
      .update({
        status: 'failed',
        error_message: result.error,
        places_resolved: 0,
        places_failed: 0,
        failures: null,
      })
      .eq('id', jobId)
    return result
  }

  const failuresPayload =
    result.failures.length > 0 ? (JSON.parse(JSON.stringify(result.failures)) as Json) : null

  await admin
    .from('social_ingest_jobs')
    .update({
      status: 'succeeded',
      error_message: null,
      source_id: result.source_id,
      places_resolved: result.places_resolved,
      places_failed: result.places_failed,
      failures: failuresPayload,
    })
    .eq('id', jobId)

  return result
}
