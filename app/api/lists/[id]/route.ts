import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countIsoDatesInclusive, parseIsoDateOnly } from '@/lib/lists/planner'

const LIST_FIELDS =
  'id, name, description, is_default, created_at, start_date, end_date, timezone'

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

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    const hasStart = hasOwn(body, 'start_date')
    const hasEnd = hasOwn(body, 'end_date')
    const hasTimezone = hasOwn(body, 'timezone')

    if (!hasStart && !hasEnd && !hasTimezone) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

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
      updates.start_date = startDate
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
      updates.end_date = endDate
    }

    if (hasStart || hasEnd) {
      const { data: existing, error: fetchError } = await supabase
        .from('lists')
        .select('id, start_date, end_date')
        .eq('id', params.id)
        .single()

      if (fetchError || !existing) {
        if (fetchError?.code === 'PGRST116') {
          return NextResponse.json({ error: 'List not found' }, { status: 404 })
        }
        return NextResponse.json(
          { error: fetchError?.message || 'Failed to load list' },
          { status: 500 }
        )
      }

      const existingRange = existing as {
        start_date: string | null
        end_date: string | null
      }
      const finalStart = hasStart ? startDate ?? null : existingRange.start_date
      const finalEnd = hasEnd ? endDate ?? null : existingRange.end_date

      if (finalStart && finalEnd && finalStart > finalEnd) {
        return NextResponse.json(
          { error: 'start_date must be on or before end_date' },
          { status: 400 }
        )
      }

      if (finalStart && finalEnd) {
        const maxTripDays = 60
        const count = countIsoDatesInclusive(finalStart, finalEnd)
        if (!count) {
          return NextResponse.json(
            { error: 'Invalid trip date range' },
            { status: 400 }
          )
        }
        if (count > maxTripDays) {
          return NextResponse.json(
            { error: `Trip range too long (${count} days). Max is ${maxTripDays} days.` },
            { status: 400 }
          )
        }
      }
    }

    if (hasTimezone) {
      if (body.timezone === null) {
        updates.timezone = null
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
        updates.timezone = tz
      }
    }

    const { data: list, error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', params.id)
      .select(LIST_FIELDS)
      .single()

    if (error || !list) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: error?.message || 'Failed to update list' },
        { status: 500 }
      )
    }

    // When trip dates change, move items outside the new range back to backlog
    if (hasStart || hasEnd) {
      const listData = list as { start_date: string | null; end_date: string | null }
      const toBacklog = supabase
        .from('list_items')
        .update({
          scheduled_date: null,
          scheduled_start_time: null,
          scheduled_order: 0,
        })
        .eq('list_id', params.id)
        .is('completed_at', null)
        .not('scheduled_date', 'is', null)

      if (listData.start_date && listData.end_date) {
        await toBacklog.or(
          `scheduled_date.lt.${listData.start_date},scheduled_date.gt.${listData.end_date}`
        )
      } else {
        // Dates cleared: move all scheduled (non-done) items to backlog
        await toBacklog
      }
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
