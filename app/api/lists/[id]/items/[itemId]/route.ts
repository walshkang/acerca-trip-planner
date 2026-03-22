import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type PlannerSlot,
  parseIsoDateOnly,
  scheduledStartTimeFromSlot,
} from '@/lib/lists/planner'

type ScheduleSource = 'drag' | 'tap_move' | 'quick_add' | 'api'

const SCHEDULE_SOURCES = new Set<ScheduleSource>([
  'drag',
  'tap_move',
  'quick_add',
  'api',
])

function hasOwn(obj: unknown, key: string) {
  return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key)
}

function isPlannerSlot(v: unknown): v is PlannerSlot {
  return v === 'morning' || v === 'afternoon' || v === 'evening'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

    const hasScheduledDate = hasOwn(body, 'scheduled_date')
    const hasDayIndex = hasOwn(body, 'day_index')
    const hasSlot = hasOwn(body, 'slot')
    const hasOrder = hasOwn(body, 'scheduled_order')
    const hasCompleted = hasOwn(body, 'completed')
    const hasSource = hasOwn(body, 'source')

    if (!hasScheduledDate && !hasDayIndex && !hasSlot && !hasOrder && !hasCompleted) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    let scheduledDate: string | null | undefined
    if (hasScheduledDate) {
      if (body.scheduled_date === null) scheduledDate = null
      else if (typeof body.scheduled_date === 'string') {
        const parsed = parseIsoDateOnly(body.scheduled_date)
        if (!parsed) {
          return NextResponse.json(
            { error: 'scheduled_date must be YYYY-MM-DD or null' },
            { status: 400 }
          )
        }
        scheduledDate = parsed
      } else {
        return NextResponse.json(
          { error: 'scheduled_date must be YYYY-MM-DD or null' },
          { status: 400 }
        )
      }
    }

    let slot: PlannerSlot | null | undefined
    if (hasSlot) {
      if (body.slot === null) slot = null
      else if (isPlannerSlot(body.slot)) slot = body.slot
      else {
        return NextResponse.json(
          { error: 'slot must be morning, afternoon, evening, or null' },
          { status: 400 }
        )
      }
    }

    let scheduledOrder: number | null | undefined
    if (hasOrder) {
      if (body.scheduled_order === null) scheduledOrder = null
      else if (
        typeof body.scheduled_order === 'number' &&
        Number.isFinite(body.scheduled_order)
      ) {
        scheduledOrder = body.scheduled_order
      } else {
        return NextResponse.json(
          { error: 'scheduled_order must be a number' },
          { status: 400 }
        )
      }
    }

    let completed: boolean | null | undefined
    if (hasCompleted) {
      if (body.completed === null) completed = null
      else if (typeof body.completed === 'boolean') completed = body.completed
      else {
        return NextResponse.json(
          { error: 'completed must be a boolean or null' },
          { status: 400 }
        )
      }
    }

    let source: ScheduleSource = 'api'
    if (hasSource) {
      if (typeof body.source !== 'string' || !SCHEDULE_SOURCES.has(body.source as any)) {
        return NextResponse.json(
          { error: 'source must be drag, tap_move, quick_add, or api' },
          { status: 400 }
        )
      }
      source = body.source as ScheduleSource
    }

    let dayIndex: number | null | undefined
    if (hasDayIndex) {
      if (body.day_index === null) dayIndex = null
      else if (
        typeof body.day_index === 'number' &&
        Number.isInteger(body.day_index) &&
        body.day_index >= 0
      ) {
        dayIndex = body.day_index
      } else {
        return NextResponse.json(
          { error: 'day_index must be a non-negative integer or null' },
          { status: 400 }
        )
      }
    }

    // day_index and scheduled_date are mutually exclusive write paths
    if (hasDayIndex && hasScheduledDate) {
      return NextResponse.json(
        { error: 'Cannot set both day_index and scheduled_date' },
        { status: 400 }
      )
    }

    // Validate slot/date coupling + scheduling order expectations.
    if (hasScheduledDate) {
      if (scheduledDate === null) {
        if (hasSlot && slot !== null) {
          return NextResponse.json(
            { error: 'slot must be null when scheduled_date is null' },
            { status: 400 }
          )
        }
      } else {
        if (!hasSlot || slot == null) {
          return NextResponse.json(
            { error: 'slot is required when scheduled_date is set' },
            { status: 400 }
          )
        }
        if (!hasOrder || scheduledOrder == null) {
          return NextResponse.json(
            { error: 'scheduled_order is required when scheduling an item' },
            { status: 400 }
          )
        }
      }
    } else if (hasSlot) {
      return NextResponse.json(
        { error: 'scheduled_date is required when slot is provided' },
        { status: 400 }
      )
    }

    if (hasOrder && scheduledOrder == null && !hasScheduledDate) {
      return NextResponse.json(
        { error: 'scheduled_order must be a number' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const updates: Record<string, unknown> = {
      last_scheduled_at: now,
      last_scheduled_by: user.id,
      last_scheduled_source: source,
    }

    if (hasCompleted && completed !== null) {
      updates.completed_at = completed ? now : null
    }

    if (hasDayIndex) {
      if (dayIndex === null) {
        updates.day_index = null
        updates.scheduled_date = null
        updates.scheduled_start_time = null
        updates.scheduled_order = 0
      } else {
        updates.day_index = dayIndex

        // Look up list start_date to derive scheduled_date
        const { data: listRow } = await supabase
          .from('lists')
          .select('start_date')
          .eq('id', params.id)
          .single()

        if (listRow?.start_date) {
          const d = new Date(`${listRow.start_date}T00:00:00Z`)
          d.setUTCDate(d.getUTCDate() + (dayIndex as number))
          updates.scheduled_date = d.toISOString().slice(0, 10)
          // Preserve existing slot if not being changed; default to morning
          if (hasSlot && slot != null) {
            updates.scheduled_start_time = scheduledStartTimeFromSlot(slot)
          } else if (!hasSlot) {
            updates.scheduled_start_time = scheduledStartTimeFromSlot('morning')
          }
          if (hasOrder && scheduledOrder != null) {
            updates.scheduled_order = scheduledOrder
          }
        }
        // If list has no start_date, day_index is stored directly, scheduled_date stays null
      }
    } else if (hasScheduledDate) {
      if (scheduledDate === null) {
        updates.scheduled_date = null
        updates.scheduled_start_time = null
        updates.scheduled_order = 0
        updates.day_index = null
      } else {
        updates.scheduled_date = scheduledDate
        updates.scheduled_start_time = scheduledStartTimeFromSlot(slot as PlannerSlot)
        updates.scheduled_order = scheduledOrder as number

        // Best-effort: derive day_index from scheduled_date when list has start_date
        try {
          const { data: listRow } = await supabase
            .from('lists')
            .select('start_date')
            .eq('id', params.id)
            .single()

          if (listRow?.start_date) {
            const startMs = Date.parse(`${listRow.start_date}T00:00:00Z`)
            const schedMs = Date.parse(`${scheduledDate}T00:00:00Z`)
            updates.day_index = Math.round((schedMs - startMs) / 86_400_000)
          }
        } catch {
          // List lookup failed; skip day_index derivation
        }
      }
    } else if (hasOrder) {
      updates.scheduled_order = scheduledOrder as number
    }

    const { data: item, error } = await supabase
      .from('list_items')
      .update(updates)
      .eq('id', params.itemId)
      .eq('list_id', params.id)
      .select(
        'id, list_id, place_id, scheduled_date, scheduled_start_time, scheduled_order, completed_at, day_index, last_scheduled_at, last_scheduled_by, last_scheduled_source'
      )
      .single()

    if (error || !item) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'List item not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: error?.message || 'Failed to update list item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

