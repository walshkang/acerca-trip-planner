import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGooglePlace,
  fetchWikipediaPages,
  fetchWikidataData,
  selectBestWikipediaMatch,
  findGooglePlaceIdFromText,
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

function parsePlaceIdFromGoogleMapsUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const placeId =
      u.searchParams.get('place_id') ??
      u.searchParams.get('query_place_id') ??
      u.searchParams.get('q')
    if (placeId && placeId.startsWith('ChI')) return placeId
    return null
  } catch {
    return null
  }
}

function looksLikeGooglePlaceId(raw: string): boolean {
  const s = raw.trim()
  return s.startsWith('ChI') && s.length >= 20 && s.length <= 200
}

function toGeographyPointWkt(lat: number, lng: number): string {
  // PostgREST/PostGIS accepts EWKT for geography columns.
  return `SRID=4326;POINT(${lng} ${lat})`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      input?: string
      place_id?: string
      include_wikipedia?: boolean
      schema_version?: number
    }

    const input = body.input?.trim()
    const includeWikipedia = body.include_wikipedia !== false
    const schemaVersion = Number.isFinite(body.schema_version)
      ? Number(body.schema_version)
      : 2

    let placeId = body.place_id?.trim() ?? null
    if (!placeId && input) {
      placeId =
        parsePlaceIdFromGoogleMapsUrl(input) ||
        (looksLikeGooglePlaceId(input) ? input : null)
    }

    if (!placeId && input) {
      const resolved = await findGooglePlaceIdFromText(input)
      placeId = resolved.placeId
    }

    if (!placeId) {
      return NextResponse.json(
        { error: 'Provide input (Google Maps URL, place_id, or name).' },
        { status: 400 }
      )
    }

    const googlePlaces = await fetchGooglePlace(placeId)

    const lat = googlePlaces.geometry?.location?.lat
    const lng = googlePlaces.geometry?.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Google Places response missing geometry.' },
        { status: 502 }
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
    }

    const { data: candidate, error } = await supabase
      .from('place_candidates')
      .insert({
        user_id: user.id,
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
      return NextResponse.json(
        { error: error?.message || 'Failed to insert candidate.' },
        { status: 500 }
      )
    }

    // Immediately enrich for preview (Search -> Preview -> Commit UX loop).
    const wikipediaTitle =
      typeof (wikipedia as any)?.bestMatch?.title === 'string'
        ? (wikipedia as any).bestMatch.title
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
      entity: (wikidata as any)?.entity ?? null,
      labelsByQid: {},
    })
    const labels =
      prelim.referencedQids.length ? await fetchWikidataLabels(prelim.referencedQids) : {}
    const facts = extractPrimaryWikidataFactPairs({
      entity: (wikidata as any)?.entity ?? null,
      labelsByQid: labels,
    }).pairs

    const wikipediaCurated = {
      version: WIKI_CURATED_VERSION,
      wikipedia_title: wikipediaTitle,
      wikidata_qid: typeof (wikidata as any)?.qid === 'string' ? (wikidata as any).qid : null,
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
      userId: user.id,
      enrichmentId: enrichment.id,
    })

    return NextResponse.json({
      candidate: {
        ...candidate,
        enrichment_id: enrichment.id,
        status: 'enriched',
      },
      google_place_id: googlePlaces.place_id,
      location: { lat, lng },
      google: {
        website: googlePlaces.website ?? null,
        url: googlePlaces.url ?? null,
        types: Array.isArray(googlePlaces.types)
          ? (googlePlaces.types.filter((t) => typeof t === 'string') as string[])
          : null,
        opening_hours: googlePlaces.opening_hours
          ? {
              open_now:
                typeof (googlePlaces.opening_hours as any)?.open_now === 'boolean'
                  ? (googlePlaces.opening_hours as any).open_now
                  : null,
              weekday_text: Array.isArray((googlePlaces.opening_hours as any)?.weekday_text)
                ? ((googlePlaces.opening_hours as any).weekday_text.filter(
                    (v: unknown) => typeof v === 'string'
                  ) as string[])
                : null,
            }
          : null,
      },
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
