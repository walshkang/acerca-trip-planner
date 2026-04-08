import { randomUUID } from 'crypto'
import { adminSupabase } from '@/lib/supabase/admin'
import { normalizeEnrichment } from '@/lib/server/enrichment/normalize'

type SeedPlaceInput = {
  userId: string
  name: string
  address: string
  lat: number
  lng: number
  sourceId?: string
}

type SeedPlaceResult = {
  candidateId: string
  enrichmentId: string
  sourceId: string
}

function toGeographyPointWkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

const SEED_ENRICHMENT_SNAPSHOT = {
  googlePlaces: {
    name: 'Playwright Seed Place',
    formatted_address: 'Playwright Seed Address',
    geometry: { location: { lat: 40.758, lng: -73.985 } },
    types: ['restaurant'],
    place_id: 'seed:playwright',
  },
}

export async function seedPlaceCandidate({
  userId,
  name,
  address,
  lat,
  lng,
  sourceId,
}: SeedPlaceInput): Promise<SeedPlaceResult> {
  const resolvedSourceId = sourceId ?? randomUUID()

  // Keep enrichment deterministic and shared across seeds to avoid churn + LLM calls.
  const enrichment = await normalizeEnrichment(
    { rawSourceSnapshot: SEED_ENRICHMENT_SNAPSHOT, schemaVersion: 2 },
    { forceDeterministic: true }
  )

  const rawPayload = {
    ...SEED_ENRICHMENT_SNAPSHOT.googlePlaces,
    name,
    formatted_address: address,
    geometry: { location: { lat, lng } },
    place_id: resolvedSourceId,
  }

  const { data: candidate, error } = await adminSupabase
    .from('place_candidates')
    .insert({
      user_id: userId,
      source: 'seed',
      source_id: `seed:${resolvedSourceId}`,
      raw_payload: rawPayload,
      name,
      address,
      location: toGeographyPointWkt(lat, lng),
      status: 'enriched',
      enrichment_id: enrichment.id,
    })
    .select('id')
    .single()

  if (error || !candidate) {
    throw new Error(error?.message || 'Failed to insert seed place candidate')
  }

  return {
    candidateId: candidate.id,
    enrichmentId: enrichment.id,
    sourceId: resolvedSourceId,
  }
}
