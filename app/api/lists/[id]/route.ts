import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIsoDateOnly } from '@/lib/lists/planner'

const LIST_FIELDS =
  'id, name, description, is_default, created_at, start_date, end_date, timezone'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type ListTripRow = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  start_date: string | null
  end_date: string | null
  timezone: string | null
}

function hasOwn(obj: unknown, key: string) {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key)
}

function normalizeTimezone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  return trimmed.length ? trimmed : null
}

function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

type PatchListTripDatesRpcError = {
  code?: string | null
  message?: string | null
}

function shouldFallbackPatchListTripDates(
  error: PatchListTripDatesRpcError
): boolean {
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()
  return code === '42702' || message.includes('ambiguous')
}

function mapPatchListTripDatesRpcError(error: PatchListTripDatesRpcError): {
  status: number
  message: string
} {
  const code = error.code ?? ''
  const message = error.message ?? ''

  if (code === 'P0002' || message === 'List not found') {
    return { status: 404, message: 'List not found' }
  }

  if (code === '42501' || message === 'Unauthorized') {
    return { status: 401, message: 'Unauthorized' }
  }

  if (code === '22023') {
    return {
      status: 400,
      message: message || 'Invalid list trip-date update payload',
    }
  }

  return {
    status: 500,
    message: message || 'Failed to update list',
  }
}

function validateTripDateRange(
  startDate: string | null,
  endDate: string | null,
  maxTripDays: number
): string | null {
  if (startDate && endDate && startDate > endDate) {
    return 'start_date must be on or before end_date'
  }

  if (!startDate || !endDate) {
    return null
  }

  const startMs = Date.parse(`${startDate}T00:00:00.000Z`)
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`)
  const dayCount = Math.floor((endMs - startMs) / 86_400_000) + 1
  if (dayCount <= 0) {
    return 'Invalid trip date range'
  }
  if (dayCount > maxTripDays) {
    return `Trip range too long (${dayCount} days). Max is ${maxTripDays} days.`
  }
  return null
}

async function fallbackPatchListTripDates(args: {
  supabase: SupabaseServerClient
  listId: string
  hasStart: boolean
  startDate: string | null | undefined
  hasEnd: boolean
  endDate: string | null | undefined
  hasTimezone: boolean
  timezone: string | null | undefined
  maxTripDays: number
}): Promise<{ list: ListTripRow } | { status: number; message: string }> {
  const {
    supabase,
    listId,
    hasStart,
    startDate,
    hasEnd,
    endDate,
    hasTimezone,
    timezone,
    maxTripDays,
  } = args

  const { data: currentList, error: currentListError } = await supabase
    .from('lists')
    .select(LIST_FIELDS)
    .eq('id', listId)
    .single()

  if (currentListError || !currentList) {
    return { status: 404, message: 'List not found' }
  }

  const current = currentList as ListTripRow
  const finalStartDate = hasStart ? (startDate ?? null) : current.start_date
  const finalEndDate = hasEnd ? (endDate ?? null) : current.end_date
  const tripRangeError = validateTripDateRange(
    finalStartDate,
    finalEndDate,
    maxTripDays
  )
  if (tripRangeError) {
    return { status: 400, message: tripRangeError }
  }

  const updates: Partial<Pick<ListTripRow, 'start_date' | 'end_date' | 'timezone'>> =
    {}
  if (hasStart) updates.start_date = startDate ?? null
  if (hasEnd) updates.end_date = endDate ?? null
  if (hasTimezone) updates.timezone = timezone ?? null

  const { data: updatedList, error: updatedListError } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', listId)
    .select(LIST_FIELDS)
    .single()

  if (updatedListError || !updatedList) {
    return {
      status: 500,
      message: updatedListError?.message || 'Failed to update list',
    }
  }

  const nextList = updatedList as ListTripRow

  if (hasStart || hasEnd) {
    const { data: scheduledItems, error: scheduledItemsError } = await supabase
      .from('list_items')
      .select('id, scheduled_date')
      .eq('list_id', listId)
      .is('completed_at', null)
      .not('scheduled_date', 'is', null)

    if (scheduledItemsError) {
      return {
        status: 500,
        message: scheduledItemsError.message || 'Failed to read list items',
      }
    }

    const resetAllScheduledItems =
      nextList.start_date === null || nextList.end_date === null
    const outOfRangeIds = (scheduledItems ?? [])
      .filter((row) => {
        const scheduledDate = row.scheduled_date
        if (!scheduledDate) return false
        if (resetAllScheduledItems) return true
        return (
          scheduledDate < (nextList.start_date as string) ||
          scheduledDate > (nextList.end_date as string)
        )
      })
      .map((row) => row.id)

    if (outOfRangeIds.length) {
      const { error: resetError } = await supabase
        .from('list_items')
        .update({
          scheduled_date: null,
          scheduled_start_time: null,
          scheduled_order: 0,
        })
        .in('id', outOfRangeIds)

      if (resetError) {
        return {
          status: 500,
          message: resetError.message || 'Failed to move out-of-range items',
        }
      }
    }
  }

  return { list: nextList }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      )
    }

    const body = parsedBody as Record<string, unknown>

    const hasStart = hasOwn(body, 'start_date')
    const hasEnd = hasOwn(body, 'end_date')
    const hasTimezone = hasOwn(body, 'timezone')

    if (!hasStart && !hasEnd && !hasTimezone) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    let startDate: string | null | undefined
    if (hasStart) {
      if (body.start_date === null) startDate = null
      else {
        if (typeof body.start_date !== 'string') {
          return NextResponse.json(
            { error: 'start_date must be YYYY-MM-DD or null' },
            { status: 400 }
          )
        }
        startDate = parseIsoDateOnly(body.start_date)
        if (!startDate) {
          return NextResponse.json(
            { error: 'start_date must be YYYY-MM-DD or null' },
            { status: 400 }
          )
        }
      }
    }

    let endDate: string | null | undefined
    if (hasEnd) {
      if (body.end_date === null) endDate = null
      else {
        if (typeof body.end_date !== 'string') {
          return NextResponse.json(
            { error: 'end_date must be YYYY-MM-DD or null' },
            { status: 400 }
          )
        }
        endDate = parseIsoDateOnly(body.end_date)
        if (!endDate) {
          return NextResponse.json(
            { error: 'end_date must be YYYY-MM-DD or null' },
            { status: 400 }
          )
        }
      }
    }

    let timezone: string | null | undefined
    if (hasTimezone) {
      if (body.timezone === null) {
        timezone = null
      } else {
        const tz = normalizeTimezone(body.timezone)
        if (!tz) {
          return NextResponse.json(
            { error: 'timezone must be a non-empty IANA string or null' },
            { status: 400 }
          )
        }
        if (!isValidIanaTimezone(tz)) {
          return NextResponse.json(
            { error: 'timezone must be a valid IANA timezone string' },
            { status: 400 }
          )
        }
        timezone = tz
      }
    }

    const maxTripDays = 60
    const { data: list, error } = await supabase
      .rpc('patch_list_trip_dates', {
        p_list_id: params.id,
        p_has_start_date: hasStart,
        p_start_date: hasStart ? (startDate ?? null) : null,
        p_has_end_date: hasEnd,
        p_end_date: hasEnd ? (endDate ?? null) : null,
        p_has_timezone: hasTimezone,
        p_timezone: hasTimezone ? (timezone ?? null) : null,
        p_max_trip_days: maxTripDays,
      })
      .single()

    if (!error && list) {
      return NextResponse.json({ list })
    }

    if (error && shouldFallbackPatchListTripDates(error)) {
      const fallback = await fallbackPatchListTripDates({
        supabase,
        listId: params.id,
        hasStart,
        startDate,
        hasEnd,
        endDate,
        hasTimezone,
        timezone,
        maxTripDays,
      })
      if ('status' in fallback) {
        return NextResponse.json(
          { error: fallback.message },
          { status: fallback.status }
        )
      }

      return NextResponse.json({ list: fallback.list })
    }

    if (error || !list) {
      const mapped = mapPatchListTripDatesRpcError({
        code: error?.code,
        message: error?.message,
      })
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      )
    }
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: list, error: fetchError } = await supabase
      .from('lists')
      .select('id, is_default')
      .eq('id', params.id)
      .single()

    if (fetchError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (list.is_default) {
      return NextResponse.json(
        { error: 'Default list cannot be deleted' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('lists').delete().eq('id', params.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
