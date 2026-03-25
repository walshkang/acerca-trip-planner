import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGooglePlace,
  searchGooglePlaces,
  SourceFetchError,
} from '@/lib/enrichment/sources'
import type {
  ImportErrorPayload,
  ImportRow,
  PreviewRow,
  ResolvedCandidate,
} from '@/lib/import/contract'
import { parseImportPreviewRequest } from '@/lib/import/contract'
import {
  candidateToResolvedCandidate,
  mapGooglePlaceToResolvedEnrichment,
} from '@/lib/import/map-google-place-to-resolved'
import {
  computeTripSummary,
  hydrateImportPreviewComputed,
} from '@/lib/import/compute'
import {
  looksLikeGooglePlaceId,
  parsePlaceIdFromGoogleMapsUrl,
} from '@/lib/places/google-place-input'

function jsonError(
  status: number,
  payload: ImportErrorPayload
): NextResponse<ImportErrorPayload> {
  return NextResponse.json(payload, { status })
}

async function resolvePreviewRow(
  row_index: number,
  input: ImportRow
): Promise<PreviewRow> {
  const base = {
    row_index,
    input,
    computed: null,
  }

  const raw = input.place_name

  try {
    const directId =
      parsePlaceIdFromGoogleMapsUrl(raw) ||
      (looksLikeGooglePlaceId(raw) ? raw.trim() : null)

    if (directId) {
      const google = await fetchGooglePlace(directId.trim())
      const resolved = mapGooglePlaceToResolvedEnrichment(
        google,
        input.place_category
      )
      return {
        ...base,
        status: 'ok',
        error_message: null,
        candidates: null,
        resolved,
      }
    }

    const found = await searchGooglePlaces(raw)
    const candidates = found
      .map(candidateToResolvedCandidate)
      .filter((c): c is ResolvedCandidate => c !== null)

    if (candidates.length === 0) {
      return {
        ...base,
        status: 'error',
        error_message:
          found.length === 0
            ? 'No places matched your search.'
            : 'No candidates with coordinates returned.',
        candidates: null,
        resolved: null,
      }
    }

    if (candidates.length === 1) {
      const google = await fetchGooglePlace(candidates[0].google_place_id)
      const resolved = mapGooglePlaceToResolvedEnrichment(
        google,
        input.place_category
      )
      return {
        ...base,
        status: 'ok',
        error_message: null,
        candidates: null,
        resolved,
      }
    }

    return {
      ...base,
      status: 'ambiguous',
      error_message: null,
      candidates,
      resolved: null,
    }
  } catch (e) {
    const message =
      e instanceof SourceFetchError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'Resolution failed.'
    return {
      ...base,
      status: 'error',
      error_message: message,
      candidates: null,
      resolved: null,
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return jsonError(401, {
        code: 'unauthorized',
        message: 'Authentication required',
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(400, {
        code: 'invalid_import_payload',
        message: 'Request body must be valid JSON',
        fieldErrors: { payload: ['Invalid JSON body'] },
      })
    }

    const parsed = parseImportPreviewRequest(body)
    if (!parsed.ok) {
      return jsonError(400, {
        code: parsed.code,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      })
    }

    const { rows, trip_start_date, trip_end_date } = parsed.request

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', params.id)
      .single()

    if (listError || !list) {
      return jsonError(404, {
        code: 'list_not_found',
        message: 'List not found or not accessible',
      })
    }

    const previewRows: PreviewRow[] = []
    for (let i = 0; i < rows.length; i++) {
      previewRows.push(await resolvePreviewRow(i, rows[i]))
    }

    hydrateImportPreviewComputed(previewRows)
    const trip_summary = computeTripSummary(
      previewRows,
      trip_start_date,
      trip_end_date
    )

    const preview_id = crypto.randomUUID()

    return NextResponse.json({
      preview_id,
      rows: previewRows,
      trip_summary,
    })
  } catch (error: unknown) {
    return jsonError(500, {
      code: 'internal_error',
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
