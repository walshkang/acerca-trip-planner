import { comparePlannerCategories, slotFromScheduledStartTime } from '@/lib/lists/planner'
import type { CategoryEnum } from '@/lib/types/enums'
import type {
  RoutingLegDraft,
  RoutingSequenceItem,
  RoutingSlotKind,
  RoutingUnroutableItem,
} from '@/lib/routing/contract'

export type RoutingSequenceInputRow = {
  item_id: string
  place_id: string
  place_name: string | null
  category: CategoryEnum | null
  scheduled_date: string
  scheduled_start_time: string | null
  scheduled_order: number | null
  created_at: string
  lat: number | null
  lng: number | null
}

export type BuildRoutingSequenceResult = {
  sequence: RoutingSequenceItem[]
  routeableSequence: RoutingSequenceItem[]
  unroutableItems: RoutingUnroutableItem[]
  legs: RoutingLegDraft[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function slotFromTime(value: string | null): RoutingSlotKind {
  const mapped = slotFromScheduledStartTime(value)
  if (mapped) return mapped
  return 'unslotted'
}

function slotRank(slot: RoutingSlotKind): number {
  if (slot === 'morning') return 0
  if (slot === 'afternoon') return 1
  if (slot === 'evening') return 2
  return 3
}

function compareCategory(a: CategoryEnum | null, b: CategoryEnum | null): number {
  if (a && b) return comparePlannerCategories(a, b)
  if (a && !b) return -1
  if (!a && b) return 1
  return 0
}

function normalizeScheduledOrder(value: number | null): number {
  if (!isFiniteNumber(value)) return 0
  return value
}

function toSequenceItem(row: RoutingSequenceInputRow): RoutingSequenceItem {
  const slot = slotFromTime(row.scheduled_start_time)
  const routeable = isFiniteNumber(row.lat) && isFiniteNumber(row.lng)

  return {
    item_id: row.item_id,
    place_id: row.place_id,
    place_name: row.place_name ?? 'Unnamed place',
    category: row.category,
    scheduled_date: row.scheduled_date,
    scheduled_start_time: row.scheduled_start_time,
    scheduled_order: normalizeScheduledOrder(row.scheduled_order),
    created_at: row.created_at,
    slot,
    slot_rank: slotRank(slot),
    lat: isFiniteNumber(row.lat) ? row.lat : null,
    lng: isFiniteNumber(row.lng) ? row.lng : null,
    routeable,
  }
}

function compareSequenceItems(a: RoutingSequenceItem, b: RoutingSequenceItem): number {
  if (a.slot_rank !== b.slot_rank) return a.slot_rank - b.slot_rank

  const byCategory = compareCategory(a.category, b.category)
  if (byCategory !== 0) return byCategory

  if (a.scheduled_order !== b.scheduled_order) {
    return a.scheduled_order - b.scheduled_order
  }

  if (a.created_at !== b.created_at) {
    return a.created_at.localeCompare(b.created_at)
  }

  return a.item_id.localeCompare(b.item_id)
}

function buildLegDrafts(items: RoutingSequenceItem[]): RoutingLegDraft[] {
  if (items.length < 2) return []
  const legs: RoutingLegDraft[] = []
  for (let index = 0; index < items.length - 1; index += 1) {
    const from = items[index]
    const to = items[index + 1]
    legs.push({
      index,
      from_item_id: from.item_id,
      to_item_id: to.item_id,
      from_place_id: from.place_id,
      to_place_id: to.place_id,
    })
  }
  return legs
}

export function buildRoutingSequence(
  rows: RoutingSequenceInputRow[]
): BuildRoutingSequenceResult {
  const sequence = rows.map(toSequenceItem).sort(compareSequenceItems)

  const routeableSequence = sequence.filter((item) => item.routeable)
  const unroutableItems = sequence
    .filter((item) => !item.routeable)
    .map((item) => ({
      item_id: item.item_id,
      place_id: item.place_id,
      place_name: item.place_name,
      reason: 'missing_coordinates' as const,
    }))

  return {
    sequence,
    routeableSequence,
    unroutableItems,
    legs: buildLegDrafts(routeableSequence),
  }
}
