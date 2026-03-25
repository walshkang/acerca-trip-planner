import { describe, expect, it } from 'vitest'
import type { ListItemRow } from '@/components/stitch/ListDetailBody'
import {
  groupItemsByPlannerSlot,
  nextScheduledOrderForSlot,
  sortItemsForDayCellDisplay,
  sortPlannerDetailItems,
} from '@/lib/lists/calendar-day-detail'

function row(
  partial: Partial<ListItemRow> & { id: string; scheduled_start_time?: string | null }
): ListItemRow {
  const place = partial.place ?? {
    id: `p-${partial.id}`,
    name: 'Place',
    category: 'Food' as const,
    address: null,
    created_at: '2025-01-01T00:00:00Z',
    user_notes: null,
  }
  return {
    id: partial.id,
    created_at: partial.created_at ?? '2025-01-01T00:00:00Z',
    scheduled_date: partial.scheduled_date ?? '2025-06-10',
    scheduled_start_time:
      partial.scheduled_start_time === undefined ? '09:00:00' : partial.scheduled_start_time,
    scheduled_end_time: partial.scheduled_end_time ?? null,
    scheduled_order: partial.scheduled_order ?? 0,
    completed_at: partial.completed_at ?? null,
    place,
    tags: partial.tags ?? [],
    day_index: partial.day_index ?? null,
  }
}

describe('calendar-day-detail grouping and sort', () => {
  it('groups by slot sentinel times', () => {
    const miniPlace = (id: string, name: string) => ({
      id,
      name,
      category: 'Food' as const,
      address: null as string | null,
      created_at: '2025-01-01T00:00:00Z',
      user_notes: null as string | null,
    })
    const items = [
      row({ id: 'a', scheduled_start_time: '14:00:00', place: miniPlace('p1', 'A') }),
      row({ id: 'b', scheduled_start_time: '09:00:00', place: miniPlace('p2', 'B') }),
      row({ id: 'c', scheduled_start_time: null, place: miniPlace('p3', 'C') }),
    ]
    const { bySlot, unscheduled } = groupItemsByPlannerSlot(items)
    expect(bySlot.morning.map((i) => i.id)).toEqual(['b'])
    expect(bySlot.afternoon.map((i) => i.id)).toEqual(['a'])
    expect(unscheduled.map((i) => i.id)).toEqual(['c'])
  })

  it('sorts Food before Sights at same order', () => {
    const a = row({
      id: 's',
      scheduled_order: 1,
      place: {
        id: 'p1',
        name: 'Sight',
        category: 'Sights',
        address: null,
        created_at: '2025-01-01T00:00:00Z',
        user_notes: null,
      },
    })
    const b = row({
      id: 'f',
      scheduled_order: 1,
      place: {
        id: 'p2',
        name: 'Food',
        category: 'Food',
        address: null,
        created_at: '2025-01-01T00:00:00Z',
        user_notes: null,
      },
    })
    const sorted = [a, b].sort(sortPlannerDetailItems)
    expect(sorted.map((i) => i.id)).toEqual(['f', 's'])
  })

  it('sortItemsForDayCellDisplay lists morning before afternoon even if morning order is higher', () => {
    const lateMorning = row({
      id: 'm',
      scheduled_start_time: '09:00:00',
      scheduled_order: 99,
    })
    const earlyAfternoon = row({
      id: 'a',
      scheduled_start_time: '14:00:00',
      scheduled_order: 1,
    })
    const sorted = sortItemsForDayCellDisplay([earlyAfternoon, lateMorning])
    expect(sorted.map((i) => i.id)).toEqual(['m', 'a'])
  })

  it('nextScheduledOrderForSlot places new morning item between last morning and first afternoon', () => {
    const morning = row({ id: 'm1', scheduled_start_time: '09:00:00', scheduled_order: 1 })
    const afternoon = row({ id: 'a1', scheduled_start_time: '14:00:00', scheduled_order: 5 })
    expect(nextScheduledOrderForSlot([morning, afternoon], 'morning')).toBe(3)
  })

  it('nextScheduledOrderForSlot empty morning uses order below first afternoon', () => {
    const afternoon = row({ id: 'a1', scheduled_start_time: '14:00:00', scheduled_order: 5 })
    expect(nextScheduledOrderForSlot([afternoon], 'morning')).toBe(4)
  })
})
