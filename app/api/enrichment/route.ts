import { NextRequest, NextResponse } from 'next/server'
import { normalizeEnrichment } from '@/lib/server/enrichment/normalize'
import { createClient } from '@/lib/supabase/server'
import { linkCandidateEnrichment } from '@/lib/server/enrichment/linkCandidateEnrichment'
import {
  fetchWikidataData,
  fetchWikidataLabels,
  fetchWikipediaPages,
  fetchWikipediaSummary,
  selectBestWikipediaMatch,
} from '@/lib/enrichment/sources'
import { extractPrimaryWikidataFactPairs } from '@/lib/enrichment/curation'
import {
  WIKI_CURATED_VERSION,
  assertValidWikiCuratedData,
} from '@/lib/enrichment/wikiCurated'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { candidate_id, schema_version = 2 } = await request.json()
    
    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }
    
    // Fetch candidate
    const { data: candidate, error: fetchError } = await supabase
      .from('place_candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    
    const rawUnknown = (candidate as { raw_payload?: unknown }).raw_payload
    const raw =
      typeof rawUnknown === 'object' && rawUnknown !== null && !Array.isArray(rawUnknown)
        ? (rawUnknown as Record<string, any>)
        : {}

    const { wikipedia: wikipediaRaw, wikidata: wikidataRaw, ...googlePlaces } = raw

    // Curated Wikipedia/Wikidata extraction (UI-safe, frozen into enrichment record)
    const placeName =
      typeof googlePlaces?.name === 'string' && googlePlaces.name.trim()
        ? googlePlaces.name.trim()
        : typeof (candidate as any)?.name === 'string'
          ? String((candidate as any).name)
          : ''

    const lat = googlePlaces?.geometry?.location?.lat
    const lng = googlePlaces?.geometry?.location?.lng

    let wikipedia = wikipediaRaw ?? null
    let wikipediaTitle: string | null =
      typeof wikipediaRaw?.bestMatch?.title === 'string'
        ? wikipediaRaw.bestMatch.title
        : null

    if (!wikipediaTitle && typeof lat === 'number' && typeof lng === 'number') {
      const pages = await fetchWikipediaPages(lat, lng)
      const best = selectBestWikipediaMatch({ placeName, candidates: pages })
      wikipedia = { geosearch: pages, bestMatch: best }
      wikipediaTitle = best?.title ?? null
    }

    let wikidata: any = wikidataRaw ?? null
    if (
      wikipediaTitle &&
      !(
        wikidataRaw &&
        typeof wikidataRaw === 'object' &&
        wikidataRaw !== null &&
        typeof (wikidataRaw as any).qid === 'string'
      )
    ) {
      wikidata = await fetchWikidataData(wikipediaTitle)
    }

    const wikiSummary = wikipediaTitle
      ? await fetchWikipediaSummary(wikipediaTitle)
      : { wikipediaTitle: null, pageid: null, summary: null, thumbnail_url: null, raw: null }

    const prelim = extractPrimaryWikidataFactPairs({
      entity: wikidata?.entity ?? null,
      labelsByQid: {},
    })
    const labels =
      prelim.referencedQids.length ? await fetchWikidataLabels(prelim.referencedQids) : {}
    const facts = extractPrimaryWikidataFactPairs({
      entity: wikidata?.entity ?? null,
      labelsByQid: labels,
    }).pairs

    const wikipediaCurated = {
      version: WIKI_CURATED_VERSION,
      wikipedia_title: wikipediaTitle ?? null,
      wikidata_qid: typeof wikidata?.qid === 'string' ? wikidata.qid : null,
      summary: wikiSummary.summary ?? null,
      thumbnail_url: wikiSummary.thumbnail_url ?? null,
      primary_fact_pairs: facts,
    }
    assertValidWikiCuratedData(wikipediaCurated)

    // Normalize enrichment (idempotent by hash of this snapshot)
    const enrichment = await normalizeEnrichment({
      rawSourceSnapshot: {
        googlePlaces,
        ...(wikipedia ? { wikipedia } : {}),
        ...(wikidata ? { wikidata } : {}),
        ...(wikiSummary?.raw ? { wikipediaSummary: wikiSummary } : {}),
        wikipediaCurated,
      },
      schemaVersion: schema_version,
    })
    
    // Update candidate with enrichment_id
    await linkCandidateEnrichment({
      candidateId: String(candidate_id),
      userId: user.id,
      enrichmentId: enrichment.id,
    })
    
    return NextResponse.json({
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
