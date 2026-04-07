import { generateObject, generateText } from 'ai'
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

const PERSONA_RUBRIC = `
Persona rubric (pick the single best fit):
- local: hidden gems, avoiding tourist traps, neighborhood insider knowledge
- luxury: price points, exclusivity, high-end service or products
- budget: value focus, affordable finds, cost-conscious choices
- design: architecture, interior aesthetics, visual composition
- foodie: flavor profiles, ingredients, culinary technique, chef focus
- adventure: outdoor activities, physical experiences, exploration
- family: kid-friendly, group logistics, family-oriented experiences
- nightlife: bars, clubs, late-night scene, drinks-forward
`.trim()

const SYSTEM_PROMPT = `
Extract travel places from this social media transcript. Start your response with { and end with }. No markdown, no backticks, no preamble.

Include a place only if ALL three conditions hold:
1. Real, named establishment (not "a cafe", "the beach", or a city/neighborhood)
2. Creator personally visited or reviewed it — not mentioned historically, aspirationally, or in passing
3. At least 2 sentences of direct experience in the transcript — skip places that are merely name-checked

${PERSONA_RUBRIC}
Per place: place_name, place_type (optional), context_snippet (direct quote), sentiment (positive|neutral|mixed), tags (up to 6 short labels, e.g. rooftop, cash-only, hidden gem), callouts (explicitly named dishes/drinks/activities only, max 10, e.g. {type:"dish",text:"pad see ew"})
`.trim()

const CHUNK_SYSTEM_PROMPT = `
Extract travel places from this transcript segment. Start your response with { and end with }. No markdown, no backticks, no preamble.

Include a place only if ALL three conditions hold:
1. Real, named establishment (not "a cafe", "the beach", or a city/neighborhood)
2. Creator personally visited or reviewed it — not mentioned historically, aspirationally, or in passing
3. At least 2 sentences of direct experience in this segment — skip places that are merely name-checked

If no qualifying places exist in this segment, return mentioned_places:[] and contains_places:false.
${PERSONA_RUBRIC} (only assign if inferable from this segment)
Per place: place_name, place_type (optional), context_snippet (direct quote), sentiment (positive|neutral|mixed), tags (up to 6 short labels), callouts (explicitly named dishes/drinks/activities only, max 10)
`.trim()

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY,
})

type SocialExtractionOutputMode = 'native-json' | 'text-json-fallback'

export function getSocialExtractionModelId(): string {
  const runtimeModel = process.env.SOCIAL_EXTRACTION_MODEL?.trim()
  const evalModel = process.env.SOCIAL_EXTRACTION_MODEL_EVAL?.trim()
  const isEvalRun = process.env.RUN_EVALS === '1'
  if (isEvalRun) {
    return evalModel || runtimeModel || 'gemini-1.5-flash'
  }
  return runtimeModel || 'gemini-1.5-flash'
}

function getExtractionModel() {
  // thinkingBudget:0 disables thinking on Gemini 2.5+ models — extraction is pattern-matching,
  // not reasoning, so thinking tokens are pure waste. No-op on models that don't support it.
  return google(getSocialExtractionModelId(), { thinkingConfig: { thinkingBudget: 0 } })
}

export function getSocialExtractionOutputMode(): SocialExtractionOutputMode {
  const configured = process.env.SOCIAL_EXTRACTION_OUTPUT_MODE?.trim()
  if (configured === 'native-json') return 'native-json'
  if (configured === 'text-json-fallback') return 'text-json-fallback'
  // Gemma models don't support native JSON schema (responseSchema); fall back automatically.
  if (getSocialExtractionModelId().toLowerCase().startsWith('gemma')) return 'text-json-fallback'
  return 'native-json'
}

const GEMINI_BATCH_SIZE = 4
const PLACES_BATCH_SIZE = 5
const GENERATION_ATTEMPTS = 4
// Schema hints: structure only (field semantics are already in the system prompts above).
const FULL_SCHEMA_HINT = `{"author_persona":"...","mentioned_places":[{"place_name":"...","place_type":"...","context_snippet":"...","sentiment":"positive|neutral|mixed","tags":["..."],"callouts":[{"type":"dish|drink|activity|tip","text":"..."}]}]}`
const CHUNK_SCHEMA_HINT = `{"author_persona":"...","contains_places":true,"mentioned_places":[{"place_name":"...","place_type":"...","context_snippet":"...","sentiment":"positive|neutral|mixed","tags":["..."],"callouts":[{"type":"dish|drink|activity|tip","text":"..."}]}]}`

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function generateObjectWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      const is429 = msg.includes('429') || msg.includes('Too Many Requests')
      if (!is429 || attempt === GENERATION_ATTEMPTS - 1) throw e
      await sleep(2 ** attempt * 400)
    }
  }
  throw lastErr
}

function stripMarkdownCodeFences(text: string): string {
  const trimmed = text.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fencedMatch ? fencedMatch[1].trim() : trimmed
}

export function extractJsonObjectFromModelText(raw: string): unknown {
  const directCandidate = raw.trim()
  const noFenceCandidate = stripMarkdownCodeFences(directCandidate)
  const spanStart = noFenceCandidate.indexOf('{')
  const spanEnd = noFenceCandidate.lastIndexOf('}')
  const spanCandidate =
    spanStart >= 0 && spanEnd > spanStart
      ? noFenceCandidate.slice(spanStart, spanEnd + 1).trim()
      : ''

  const candidates = Array.from(
    new Set([directCandidate, noFenceCandidate, spanCandidate].filter((c) => c.length > 0))
  )

  let lastParseError: unknown
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (error) {
      lastParseError = error
    }
  }
  throw new Error(
    `social_extraction_text_invalid_json:${lastParseError instanceof Error ? lastParseError.message : 'parse_failed'}`
  )
}

function isTruncationFinishReason(reason: string | undefined): boolean {
  if (!reason) return false
  const normalized = reason.toLowerCase()
  return (
    normalized.includes('length') ||
    normalized.includes('max') ||
    normalized.includes('token') ||
    normalized.includes('incomplete')
  )
}

function shouldRetryTextFallbackError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('social_extraction_text_truncated')) return false
  return (
    message.includes('429') ||
    message.includes('Too Many Requests') ||
    message.includes('social_extraction_text_invalid_json') ||
    message.includes('social_extraction_invalid:') ||
    message.includes('social_extraction_chunk_invalid:')
  )
}

const CALLOUT_TYPE_ALIAS: Record<string, 'dish' | 'drink' | 'activity' | 'tip'> = {
  dishes: 'dish',
  food: 'dish',
  foods: 'dish',
  meal: 'dish',
  meals: 'dish',
  beverage: 'drink',
  beverages: 'drink',
  cocktail: 'drink',
  cocktails: 'drink',
  mocktail: 'drink',
  mocktails: 'drink',
  coffee: 'drink',
  coffees: 'drink',
  activity: 'activity',
  activities: 'activity',
  tip: 'tip',
  tips: 'tip',
}

function normalizeCalloutType(value: unknown): 'dish' | 'drink' | 'activity' | 'tip' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'dish' || normalized === 'drink' || normalized === 'activity' || normalized === 'tip') {
    return normalized
  }
  return CALLOUT_TYPE_ALIAS[normalized] ?? null
}

function sanitizeMentionCallouts(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const mention = value as { callouts?: unknown[] }
  if (!Array.isArray(mention.callouts)) return mention
  const callouts = mention.callouts
    .map((callout) => {
      if (!callout || typeof callout !== 'object') return null
      const c = callout as { type?: unknown; text?: unknown }
      const type = normalizeCalloutType(c.type)
      if (!type) return null
      return { ...c, type }
    })
    .filter((callout): callout is { type: 'dish' | 'drink' | 'activity' | 'tip'; text?: unknown } => !!callout)
  return { ...(mention as Record<string, unknown>), callouts }
}

export function sanitizeSocialExtractionPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const payload = raw as { mentioned_places?: unknown[] }
  if (!Array.isArray(payload.mentioned_places)) return payload
  return {
    ...(payload as Record<string, unknown>),
    mentioned_places: payload.mentioned_places.map((mention) => sanitizeMentionCallouts(mention)),
  }
}

export function sanitizeSocialExtractionChunkPayload(raw: unknown): unknown {
  return sanitizeSocialExtractionPayload(raw)
}

async function generateTextJsonWithRetry<T>(params: {
  system: string
  prompt: string
  schemaHint: string
  parse: (value: unknown) => { ok: true; data: T } | { ok: false; message: string }
  errorPrefix: 'social_extraction_invalid' | 'social_extraction_chunk_invalid'
}): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
    try {
      const generated = await generateText({
        model: getExtractionModel(),
        system: `${params.system}\n\nJSON shape: ${params.schemaHint}`,
        prompt: params.prompt,
        temperature: 0,
      })

      const finishReason = (generated as { finishReason?: string }).finishReason
      if (isTruncationFinishReason(finishReason)) {
        throw new Error(`social_extraction_text_truncated:${finishReason}`)
      }

      const parsedObject = extractJsonObjectFromModelText(generated.text)
      const sanitized =
        params.errorPrefix === 'social_extraction_invalid'
          ? sanitizeSocialExtractionPayload(parsedObject)
          : sanitizeSocialExtractionChunkPayload(parsedObject)
      const validated = params.parse(sanitized)
      if (!validated.ok) {
        throw new Error(`${params.errorPrefix}:${validated.message}`)
      }
      return validated.data
    } catch (error) {
      lastErr = error
      if (!shouldRetryTextFallbackError(error) || attempt === GENERATION_ATTEMPTS - 1) {
        throw error
      }
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

export async function extractMergedSocialExtraction(
  transcript: string
): Promise<MergedSocialExtraction> {
  const outputMode = getSocialExtractionOutputMode()
  const { maxChars } = getChunkingConfigFromEnv()
  if (transcript.length <= maxChars) {
    const data =
      outputMode === 'native-json'
        ? await generateObjectWithRetry(() =>
            generateObject({
              model: getExtractionModel(),
              schema: socialExtractionSchema,
              system: SYSTEM_PROMPT,
              prompt: transcript,
              temperature: 0,
            }).then((generated) => {
              const extractionParsed = parseSocialExtraction(
                sanitizeSocialExtractionPayload(generated.object)
              )
              if (!extractionParsed.ok) {
                throw new Error(`social_extraction_invalid:${extractionParsed.message}`)
              }
              return extractionParsed.data
            })
          )
        : await generateTextJsonWithRetry({
            system: SYSTEM_PROMPT,
            prompt: transcript,
            schemaHint: FULL_SCHEMA_HINT,
            parse: parseSocialExtraction,
            errorPrefix: 'social_extraction_invalid',
          })
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
        outputMode === 'native-json'
          ? generateObjectWithRetry(() =>
              generateObject({
                model: getExtractionModel(),
                schema: socialExtractionChunkSchema,
                system: CHUNK_SYSTEM_PROMPT,
                prompt: text,
                temperature: 0,
              })
            ).then((generated) => {
              const extractionParsed = parseSocialExtractionChunk(
                sanitizeSocialExtractionChunkPayload(generated.object)
              )
              if (!extractionParsed.ok) {
                throw new Error(`social_extraction_chunk_invalid:${extractionParsed.message}`)
              }
              return extractionParsed.data
            })
          : generateTextJsonWithRetry({
              system: CHUNK_SYSTEM_PROMPT,
              prompt: text,
              schemaHint: CHUNK_SCHEMA_HINT,
              parse: parseSocialExtractionChunk,
              errorPrefix: 'social_extraction_chunk_invalid',
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
export async function persistSocialIngest(
  request: IngestSocialRequest,
  onProgress?: (msg: string) => void
): Promise<IngestSocialResult> {
  try {
    const extraction = await extractMergedSocialExtraction(request.transcript)

    const sourceId = await ensureSourceId({
      request,
      authorPersona: extraction.author_persona,
    })

    const sourceUserId = requireSocialSystemUserId()
    const supabase = getAdminSupabase()
    const extractedMentions = dedupeExtractedMentions(
      extraction.mentioned_places as ExtractedMention[]
    )
    onProgress?.(`Resolving ${extractedMentions.length} places...`)

    const allResults = await Promise.all(
      chunk(extractedMentions, PLACES_BATCH_SIZE).map((batch) =>
        Promise.all(
          batch.map(async (mention) => {
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
                return {
                  ok: false as const,
                  place_name: mention.place_name,
                  reason: 'no_google_match',
                }
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

              return { ok: true as const }
            } catch (error) {
              return {
                ok: false as const,
                place_name: mention.place_name,
                reason: error instanceof Error ? error.message : 'place_resolution_failed',
              }
            }
          })
        )
      )
    )

    const flatResults = allResults.flat()
    const failures: IngestFailure[] = flatResults
      .filter((r) => !r.ok)
      .map((r) => ({
        place_name: (r as { place_name: string }).place_name,
        reason: (r as { reason: string }).reason,
      }))
    const placesResolved = flatResults.filter((r) => r.ok).length
    onProgress?.(`Done - ${placesResolved} places added`)

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
  jobId: string,
  onProgress?: (msg: string) => void
): Promise<IngestSocialResult> {
  const result = await persistSocialIngest(request, onProgress)
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
