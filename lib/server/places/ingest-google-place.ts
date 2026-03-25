import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchGooglePlace,
  fetchWikipediaPages,
  fetchWikidataData,
  selectBestWikipediaMatch,
  fetchWikipediaSummary,
  fetchWikidataLabels,
} from '@/lib/enrichment/sources'
import { normalizeEnrichment } from '@/lib/server/enrichment/normalize'
import { linkCandidateEnrichment } from '@/lib/server/enrichment/linkCandidateEnrichment'
import { extractPrimaryWikidataFactPairs } from '@/lib/enrichment/curation'
import {
  WIKI_CURATED_VERSION,
  assertValidWikiCuratedData,
} from '@/lib/enrichment/wikiCurated'
import type { EnrichmentOutput } from '@/lib/enrichment/contract'
import type { Database, Json } from '@/lib/supabase/types'

export function toGeographyPointWkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}

export type IngestGooglePlaceAsCandidateCode =
  | 'missing_geometry'
  | 'candidate_insert_failed'

export class IngestGooglePlaceError extends Error {
  readonly code: IngestGooglePlaceAsCandidateCode
  readonly dbMessage?: string

  constructor(
    code: IngestGooglePlaceAsCandidateCode,
    message: string,
    dbMessage?: string
  ) {
    super(message)
    this.name = 'IngestGooglePlaceError'
    this.code = code
    this.dbMessage = dbMessage
  }
}

type SupabaseServer = SupabaseClient<Database>

export type IngestGooglePlaceAsCandidateRow = {
  id: string
  status: string
  name: string
  address: string | null
  source: string
  source_id: string
  created_at: string
  enrichment_id: string | null
}

export type IngestGooglePlaceAsCandidateResult = {
  candidate: IngestGooglePlaceAsCandidateRow & { enrichment_id: string; status: string }
  googlePlaces: Awaited<ReturnType<typeof fetchGooglePlace>>
  enrichment: EnrichmentOutput
  lat: number
  lng: number
}

export async function ingestGooglePlaceAsCandidate(options: {
  supabase: SupabaseServer
  userId: string
  googlePlaceId: string
  includeWikipedia?: boolean
  schemaVersion?: number
}): Promise<IngestGooglePlaceAsCandidateResult> {
  const {
    supabase,
    userId,
    googlePlaceId,
    includeWikipedia = true,
    schemaVersion = 2,
  } = options

  const googlePlaces = await fetchGooglePlace(googlePlaceId.trim())

  const lat = googlePlaces.geometry?.location?.lat
  const lng = googlePlaces.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new IngestGooglePlaceError(
      'missing_geometry',
      'Google Places response missing geometry.'
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
  } as unknown as Json

  const { data: candidate, error } = await supabase
    .from('place_candidates')
    .insert({
      user_id: userId,
      source: 'google',
      source_id: `google:${googlePlaces.place_id}`,
      raw_payload,
      name: googlePlaces.name,
      address: googlePlaces.formatted_address ?? null,
      location: toGeographyPointWkt(lat, lng),
      status: 'new',
    })
    .select('id, status, name, address, source, source_id, created_at, enrichment_id')
    .single()

  if (error || !candidate) {
    throw new IngestGooglePlaceError(
      'candidate_insert_failed',
      error?.message || 'Failed to insert candidate.',
      error?.message
    )
  }

  const wikipediaTitle =
    typeof (wikipedia as { bestMatch?: { title?: string } })?.bestMatch?.title ===
    'string'
      ? (wikipedia as { bestMatch: { title: string } }).bestMatch.title
      : null

  const wikiSummary = wikipediaTitle
    ? await fetchWikipediaSummary(wikipediaTitle)
    : {
        wikipediaTitle: null,
        pageid: null,
        summary: null,
        thumbnail_url: null,
        raw: null,
      }

  const prelim = extractPrimaryWikidataFactPairs({
    entity: (wikidata as { entity?: unknown } | null)?.entity ?? null,
    labelsByQid: {},
  })
  const labels =
    prelim.referencedQids.length ? await fetchWikidataLabels(prelim.referencedQids) : {}
  const facts = extractPrimaryWikidataFactPairs({
    entity: (wikidata as { entity?: unknown } | null)?.entity ?? null,
    labelsByQid: labels,
  }).pairs

  const wikidataQid =
    typeof (wikidata as { qid?: string } | null)?.qid === 'string'
      ? (wikidata as { qid: string }).qid
      : null

  const wikipediaCurated = {
    version: WIKI_CURATED_VERSION,
    wikipedia_title: wikipediaTitle,
    wikidata_qid: wikidataQid,
    summary: wikiSummary.summary ?? null,
    thumbnail_url: wikiSummary.thumbnail_url ?? null,
    primary_fact_pairs: facts,
  }
  assertValidWikiCuratedData(wikipediaCurated)

  const enrichment = await normalizeEnrichment({
    rawSourceSnapshot: {
      googlePlaces,
      ...(wikipedia ? { wikipedia } : {}),
      ...(wikidata ? { wikidata } : {}),
      ...(wikiSummary?.raw ? { wikipediaSummary: wikiSummary } : {}),
      wikipediaCurated,
    },
    schemaVersion,
  })

  await linkCandidateEnrichment({
    candidateId: candidate.id,
    userId,
    enrichmentId: enrichment.id,
  })

  return {
    candidate: {
      ...candidate,
      source_id: candidate.source_id ?? `google:${googlePlaces.place_id}`,
      enrichment_id: enrichment.id,
      status: 'enriched',
    },
    googlePlaces,
    enrichment,
    lat,
    lng,
  }
}
