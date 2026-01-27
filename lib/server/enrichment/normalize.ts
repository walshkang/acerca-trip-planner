import { adminSupabase } from '@/lib/supabase/admin'
import {
  EnrichmentInput,
  EnrichmentOutput,
  computeSourceHash,
} from '@/lib/enrichment/contract'
import type { CategoryEnum, EnergyEnum } from '@/lib/types/enums'

const CATEGORY_ENUM: CategoryEnum[] = ['Food', 'Coffee', 'Sights', 'Shop', 'Activity']
const ENERGY_ENUM: EnergyEnum[] = ['Low', 'Medium', 'High']

type NormalizedData = EnrichmentOutput['normalizedData']

function isCategoryEnum(v: unknown): v is CategoryEnum {
  return typeof v === 'string' && (CATEGORY_ENUM as string[]).includes(v)
}

function isEnergyEnum(v: unknown): v is EnergyEnum {
  return typeof v === 'string' && (ENERGY_ENUM as string[]).includes(v)
}

function assertValidNormalizedData(data: unknown): asserts data is NormalizedData {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Normalized data must be an object')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any

  if (!isCategoryEnum(d.category)) {
    throw new Error('Normalized data category must be a valid CategoryEnum')
  }

  if (d.energy !== undefined && d.energy !== null && !isEnergyEnum(d.energy)) {
    throw new Error('Normalized data energy must be a valid EnergyEnum')
  }

  if (!Array.isArray(d.tags) || d.tags.some((t: any) => typeof t !== 'string')) {
    throw new Error('Normalized data tags must be an array of strings')
  }

  if (d.vibe !== undefined && d.vibe !== null && typeof d.vibe !== 'string') {
    throw new Error('Normalized data vibe must be a string when provided')
  }
}

function normalizeTagsFromGoogleTypes(types?: unknown): string[] {
  if (!Array.isArray(types)) return []
  const blacklist = new Set(['point_of_interest', 'establishment'])
  const out: string[] = []
  for (const t of types) {
    if (typeof t !== 'string') continue
    if (blacklist.has(t)) continue
    out.push(t.replace(/_/g, '-').toLowerCase())
  }
  return Array.from(new Set(out)).slice(0, 20)
}

function deterministicFallbackNormalize(
  snapshot: EnrichmentInput['rawSourceSnapshot']
): NormalizedData {
  const google = snapshot.googlePlaces ?? {}
  const types = (google as any)?.types as unknown
  const tags = normalizeTagsFromGoogleTypes(types)

  const tset = new Set(Array.isArray(types) ? (types as any[]) : [])
  const has = (k: string) => tset.has(k)

  let category: CategoryEnum = 'Activity'
  if (has('cafe') || has('coffee_shop')) category = 'Coffee'
  else if (
    has('restaurant') ||
    has('meal_takeaway') ||
    has('meal_delivery') ||
    has('bakery') ||
    has('bar')
  )
    category = 'Food'
  else if (
    has('tourist_attraction') ||
    has('museum') ||
    has('park') ||
    has('art_gallery') ||
    has('church') ||
    has('place_of_worship') ||
    has('natural_feature')
  )
    category = 'Sights'
  else if (
    has('store') ||
    has('shopping_mall') ||
    has('clothing_store') ||
    has('department_store') ||
    has('book_store')
  )
    category = 'Shop'

  return { category, tags }
}

async function normalizeWithOpenAI(
  snapshot: EnrichmentInput['rawSourceSnapshot']
): Promise<{ normalizedData: NormalizedData; model: string; promptVersion: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const model = process.env.NORMALIZE_LLM_MODEL || 'gpt-4o-mini'
  const promptVersion = 'v1.0'

  const system = [
    'You are a strict normalization function.',
    'Return ONLY a JSON object with keys: category, energy (optional), tags, vibe (optional).',
    `category must be one of: ${CATEGORY_ENUM.join(', ')}.`,
    `energy (if provided) must be one of: ${ENERGY_ENUM.join(', ')}.`,
    'tags must be an array of strings (max 20), short, lowercase-kebab-case preferred.',
    'Do not invent facts; only normalize from provided raw sources.',
  ].join('\n')

  const user = `RAW_SOURCES_JSON:\n${JSON.stringify(snapshot)}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI error HTTP ${res.status}: ${text}`)
  }

  const json = (await res.json()) as any
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI response missing message content')
  }

  let normalizedData: unknown
  try {
    normalizedData = JSON.parse(content)
  } catch {
    throw new Error('OpenAI response was not valid JSON')
  }

  assertValidNormalizedData(normalizedData)

  return { normalizedData, model, promptVersion }
}

/**
 * Deterministic normalization (idempotent)
 * Checks if enrichment exists, otherwise creates new one
 */
export async function normalizeEnrichment(
  input: EnrichmentInput
): Promise<EnrichmentOutput> {
  const supabase = adminSupabase
  
  // Compute canonicalized hash
  const sourceHash = await computeSourceHash(input.rawSourceSnapshot)
  
  // Check if enrichment already exists (idempotency)
  const { data: existing } = await supabase
    .from('enrichments')
    .select('*')
    .eq('source_hash', sourceHash)
    .eq('schema_version', input.schemaVersion)
    .single()
  
  if (existing) {
    // Return existing enrichment
    return {
      id: existing.id,
      normalizedData: existing.normalized_data,
      sourceHash: existing.source_hash,
      model: existing.model,
      temperature: Number(existing.temperature),
      promptVersion: existing.prompt_version,
    }
  }
  
  const useLlm = Boolean(process.env.OPENAI_API_KEY)
  const { normalizedData, model, promptVersion } = useLlm
    ? await normalizeWithOpenAI(input.rawSourceSnapshot)
    : {
        normalizedData: deterministicFallbackNormalize(input.rawSourceSnapshot),
        model: 'deterministic-fallback',
        promptVersion: 'fallback-v1',
      }
  
  // Store new enrichment
  const { data: enrichment, error } = await supabase
    .from('enrichments')
    .insert({
      source_hash: sourceHash,
      schema_version: input.schemaVersion,
      normalized_data: normalizedData,
      raw_sources: input.rawSourceSnapshot,
      model,
      temperature: 0,
      prompt_version: promptVersion,
    })
    .select()
    .single()
  
  if (error || !enrichment) {
    throw new Error(`Failed to create enrichment: ${error?.message}`)
  }
  
  return {
    id: enrichment.id,
    normalizedData: enrichment.normalized_data,
    sourceHash: enrichment.source_hash,
    model: enrichment.model,
    temperature: Number(enrichment.temperature),
    promptVersion: enrichment.prompt_version,
  }
}
