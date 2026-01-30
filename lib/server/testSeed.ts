import { adminSupabase } from '@/lib/supabase/admin'
import { normalizeEnrichment } from '@/lib/server/enrichment/normalize'

type SeedPlaceInput = {
  userId: string
  name: string
  address: string
  lat: number
  lng: number
  sourceId: string
}

type SeedPlaceResult = {
  candidateId: string
  enrichmentId: string
}

function toGeographyPointWkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

export async function seedPlaceCandidate({
  userId,
  name,
  address,
  lat,
  lng,
  sourceId,
}: SeedPlaceInput): Promise<SeedPlaceResult> {
  const rawSourceSnapshot = {
    googlePlaces: {
      name,
      formatted_address: address,
      geometry: { location: { lat, lng } },
      types: ['restaurant'],
      place_id: sourceId,
    },
  }

  const enrichment = await normalizeEnrichment({
    rawSourceSnapshot,
    schemaVersion: 2,
  })

  const { data: candidate, error } = await adminSupabase
    .from('place_candidates')
    .insert({
      user_id: userId,
      source: 'seed',
      source_id: `seed:${sourceId}`,
      raw_payload: rawSourceSnapshot,
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

  return { candidateId: candidate.id, enrichmentId: enrichment.id }
}
