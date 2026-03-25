import { NextRequest, NextResponse } from 'next/server'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import { SourceFetchError } from '@/lib/enrichment/sources'
import { scheduledDateOutsideListTripBounds } from '@/lib/import/commit-validation'
import type {
  CommitError,
  CommittedRow,
  ConfirmedRow,
  ImportCommitResponse,
  ImportErrorPayload,
} from '@/lib/import/contract'
import { parseImportCommitRequest } from '@/lib/import/contract'
import { nextScheduledOrderForSlot } from '@/lib/lists/calendar-day-detail'
import { normalizeTag, normalizeTagList } from '@/lib/lists/tags'
import type { PlannerSlot } from '@/lib/lists/planner'
import { scheduledStartTimeFromSlot } from '@/lib/lists/planner'
import {
  IngestGooglePlaceError,
  ingestGooglePlaceAsCandidate,
} from '@/lib/server/places/ingest-google-place'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { CategoryEnum } from '@/lib/types/enums'

const TYPE_TAG_BLOCKLIST = new Set([
  'food',
  'coffee',
  'drinks',
  'drink',
  'bar',
  'bars',
  'sights',
  'sight',
  'shop',
  'shopping',
  'activity',
  'activities',
])

function jsonError(
  status: number,
  payload: ImportErrorPayload
): NextResponse<ImportErrorPayload> {
  return NextResponse.json(payload, { status })
}

function isCategoryEnum(value: string): value is CategoryEnum {
  return (CATEGORY_ENUM_VALUES as readonly string[]).includes(value)
}

function toPlannerListItemRow(row: {
  id: string
  created_at: string
  scheduled_date: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  scheduled_order: number | null
  completed_at: string | null
  tags: string[] | null
  day_index?: number | null
  place: { category: string | null } | null
}): ListItemRow {
  const cat = row.place?.category
  return {
    id: row.id,
    created_at: row.created_at,
    scheduled_date: row.scheduled_date,
    scheduled_start_time: row.scheduled_start_time,
    scheduled_end_time: row.scheduled_end_time,
    scheduled_order: row.scheduled_order,
    completed_at: row.completed_at,
    tags: row.tags,
    day_index: row.day_index ?? null,
    place:
      cat && isCategoryEnum(cat)
        ? {
            id: '',
            name: '',
            category: cat,
            address: null,
            created_at: row.created_at,
            user_notes: null,
            google_rating: null,
            google_review_count: null,
          }
        : null,
  }
}

async function findExistingPlaceIdForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  googlePlaceId: string
): Promise<string | null> {
  const sourceId = `google:${googlePlaceId}`
  const { data: bySource } = await supabase
    .from('places')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'google')
    .eq('source_id', sourceId)
    .maybeSingle()

  if (bySource?.id) return bySource.id

  const { data: byLegacy } = await supabase
    .from('places')
    .select('id')
    .eq('user_id', userId)
    .eq('google_place_id', googlePlaceId)
    .maybeSingle()

  return byLegacy?.id ?? null
}

async function seedTagsForPlace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  placeId: string,
  enrichmentId: string | null
): Promise<string[]> {
  if (!enrichmentId) return []
  const { data: enrichment } = await supabase
    .from('enrichments')
    .select('normalized_data')
    .eq('id', enrichmentId)
    .single()

  const raw = enrichment?.normalized_data as
    | { tags?: unknown; category?: unknown }
    | null
    | undefined
  const normalizedFromEnrichment = normalizeTagList(raw?.tags)
  if (!normalizedFromEnrichment?.length) return []

  const normalizedCategory =
    typeof raw?.category === 'string' ? normalizeTag(raw.category) : null
  return normalizedFromEnrichment.filter((tag) => {
    if (TYPE_TAG_BLOCKLIST.has(tag)) return false
    if (normalizedCategory && tag === normalizedCategory) return false
    return true
  })
}

async function processCommitRow(options: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  listId: string
  listStartDate: string | null
  row: ConfirmedRow
}): Promise<{ ok: true; result: CommittedRow } | { ok: false; error: CommitError }> {
  const { supabase, userId, listId, listStartDate, row } = options
  const googlePlaceId = row.google_place_id.trim()

  let placeId = await findExistingPlaceIdForUser(supabase, userId, googlePlaceId)
  let hadListItemBefore = false

  if (placeId) {
    const { data: existingItem } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', listId)
      .eq('place_id', placeId)
      .maybeSingle()
    hadListItemBefore = !!existingItem
  }

  if (!placeId) {
    try {
      const { candidate } = await ingestGooglePlaceAsCandidate({
        supabase,
        userId,
        googlePlaceId,
        includeWikipedia: true,
        schemaVersion: 2,
      })

      const { data: promotedPlaceId, error: rpcError } = await supabase.rpc(
        'promote_place_candidate',
        {
          p_candidate_id: candidate.id,
          p_list_id: listId,
        }
      )

      if (rpcError || promotedPlaceId == null) {
        return {
          ok: false,
          error: {
            row_index: row.row_index,
            error_message:
              rpcError?.message || 'promote_place_candidate failed',
          },
        }
      }

      placeId = promotedPlaceId as string
      hadListItemBefore = false
    } catch (e) {
      const message =
        e instanceof IngestGooglePlaceError
          ? e.message
          : e instanceof SourceFetchError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Ingest failed'
      return {
        ok: false,
        error: { row_index: row.row_index, error_message: message },
      }
    }
  } else if (!hadListItemBefore) {
    const { error: insertErr } = await supabase.from('list_items').insert({
      list_id: listId,
      place_id: placeId,
    })
    if (
      insertErr &&
      insertErr.code !== '23505' &&
      !insertErr.message?.includes('duplicate')
    ) {
      return {
        ok: false,
        error: {
          row_index: row.row_index,
          error_message: insertErr.message || 'Failed to add place to list',
        },
      }
    }
  }

  const { data: placeRow, error: placeRowError } = await supabase
    .from('places')
    .select('id, enrichment_id')
    .eq('id', placeId)
    .eq('user_id', userId)
    .single()

  if (placeRowError || !placeRow) {
    return {
      ok: false,
      error: {
        row_index: row.row_index,
        error_message: placeRowError?.message || 'Place not found after commit step',
      },
    }
  }

  const { data: listItem, error: listItemError } = await supabase
    .from('list_items')
    .select('id, tags')
    .eq('list_id', listId)
    .eq('place_id', placeId)
    .maybeSingle()

  if (listItemError || !listItem) {
    return {
      ok: false,
      error: {
        row_index: row.row_index,
        error_message:
          listItemError?.message || 'List item missing after promote/insert',
      },
    }
  }

  const hasItemTagsField = row.item_tags !== undefined
  const normalizedProvided = hasItemTagsField
    ? normalizeTagList(row.item_tags)
    : []
  if (hasItemTagsField && normalizedProvided === null) {
    return {
      ok: false,
      error: {
        row_index: row.row_index,
        error_message: 'item_tags must be a string or string[]',
      },
    }
  }
  const providedTags = normalizedProvided ?? []

  const seedTags = await seedTagsForPlace(
    supabase,
    placeRow.id,
    placeRow.enrichment_id
  )
  const desiredTags =
    seedTags.length || providedTags.length
      ? (normalizeTagList([...seedTags, ...providedTags]) ?? [])
      : []

  const existingTags = Array.isArray(listItem.tags) ? listItem.tags : []
  const shouldUpdateTags =
    desiredTags.length > 0 &&
    (hasItemTagsField || existingTags.length === 0)

  const hasSchedule =
    row.scheduled_date !== undefined && row.scheduled_slot !== undefined

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {}

  if (shouldUpdateTags) {
    patch.tags = desiredTags
  }

  if (hasSchedule) {
    const scheduledDate = row.scheduled_date!
    const slot = row.scheduled_slot as PlannerSlot

    const { data: dayRows, error: dayErr } = await supabase
      .from('list_items')
      .select(
        `
        id,
        created_at,
        scheduled_date,
        scheduled_start_time,
        scheduled_end_time,
        scheduled_order,
        completed_at,
        tags,
        day_index,
        place:places(category)
      `
      )
      .eq('list_id', listId)
      .eq('scheduled_date', scheduledDate)

    if (dayErr) {
      return {
        ok: false,
        error: {
          row_index: row.row_index,
          error_message: dayErr.message || 'Failed to load day items',
        },
      }
    }

    const mapped = (dayRows ?? [])
      .filter((r) => r.id !== listItem.id)
      .map((r) => {
        const raw = r as {
          id: string
          created_at: string
          scheduled_date: string | null
          scheduled_start_time: string | null
          scheduled_end_time: string | null
          scheduled_order: number | null
          completed_at: string | null
          tags: string[] | null
          day_index?: number | null
          place:
            | { category: string | null }
            | { category: string | null }[]
            | null
        }
        const p = Array.isArray(raw.place) ? raw.place[0] : raw.place
        return toPlannerListItemRow({
          ...raw,
          place: p ?? null,
        })
      })

    const nextOrder = nextScheduledOrderForSlot(mapped, slot)

    patch.scheduled_date = scheduledDate
    patch.scheduled_start_time = scheduledStartTimeFromSlot(slot)
    patch.scheduled_order = nextOrder
    patch.last_scheduled_at = now
    patch.last_scheduled_by = userId
    patch.last_scheduled_source = 'api'

    if (listStartDate) {
      const startMs = Date.parse(`${listStartDate}T00:00:00Z`)
      const schedMs = Date.parse(`${scheduledDate}T00:00:00Z`)
      patch.day_index = Math.round((schedMs - startMs) / 86_400_000)
    } else {
      patch.day_index = null
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error: updErr } = await supabase
      .from('list_items')
      .update(patch)
      .eq('id', listItem.id)

    if (updErr) {
      return {
        ok: false,
        error: {
          row_index: row.row_index,
          error_message: updErr.message || 'Failed to update list item',
        },
      }
    }
  }

  return {
    ok: true,
    result: {
      row_index: row.row_index,
      place_id: placeId,
      list_item_id: listItem.id,
      status: hadListItemBefore ? 'updated' : 'created',
    },
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
        code: 'invalid_import_commit_payload',
        message: 'Request body must be valid JSON',
        fieldErrors: { payload: ['Invalid JSON body'] },
      })
    }

    const parsed = parseImportCommitRequest(body)
    if (!parsed.ok) {
      return jsonError(400, {
        code: parsed.code,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      })
    }

    const { confirmed_rows: confirmedRows } = parsed.request

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, start_date, end_date')
      .eq('id', params.id)
      .single()

    if (listError || !list) {
      return jsonError(404, {
        code: 'list_not_found',
        message: 'List not found or not accessible',
      })
    }

    const listBounds = {
      start_date: list.start_date ?? null,
      end_date: list.end_date ?? null,
    }

    const hasAnyBounds = listBounds.start_date != null || listBounds.end_date != null
    if (hasAnyBounds) {
      for (const row of confirmedRows) {
        if (row.scheduled_date === undefined) continue
        if (scheduledDateOutsideListTripBounds(row.scheduled_date, listBounds)) {
          return jsonError(400, {
            code: 'date_outside_trip_range',
            message: `scheduled_date ${row.scheduled_date} is outside the list trip date range`,
            fieldErrors: {
              [`confirmed_rows[${row.row_index}].scheduled_date`]: [
                'Date must fall within the list start_date and end_date',
              ],
            },
          })
        }
      }
    }

    const committed: CommittedRow[] = []
    const errors: CommitError[] = []

    for (const row of confirmedRows) {
      const outcome = await processCommitRow({
        supabase,
        userId: user.id,
        listId: params.id,
        listStartDate: listBounds.start_date,
        row,
      })
      if (outcome.ok) {
        committed.push(outcome.result)
      } else {
        errors.push(outcome.error)
      }
    }

    const response: ImportCommitResponse = { committed, errors }
    return NextResponse.json(response)
  } catch (error: unknown) {
    return jsonError(500, {
      code: 'internal_error',
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
