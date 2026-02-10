import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIsoDateOnly } from '@/lib/lists/planner'

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

    return NextResponse.json({ list })
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
