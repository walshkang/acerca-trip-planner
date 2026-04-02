import { mapMarkerRingClasses } from '@/lib/slots'
import { slotFromScheduledStartTime } from '@/lib/lists/planner'
import type { PlaceMarkerVariant } from '@/components/map/MapView.types'

export type ItemScheduleFields = {
  completed_at: string | null
  scheduled_date: string | null
  scheduled_start_time: string | null
}

export function mapRingClassesForListItem(item: ItemScheduleFields | undefined): string {
  if (!item) {
    return mapMarkerRingClasses({ completed: false, hasScheduledDate: false, slot: null })
  }
  if (item.completed_at) {
    return mapMarkerRingClasses({ completed: true, hasScheduledDate: false, slot: null })
  }
  const slot = item.scheduled_date
    ? slotFromScheduledStartTime(item.scheduled_start_time)
    : null
  return mapMarkerRingClasses({
    completed: false,
    hasScheduledDate: Boolean(item.scheduled_date),
    slot,
  })
}

/** When `getPlaceMarkerRingClassName` is not passed to MapView. */
export function fallbackMarkerRingClass(variant: PlaceMarkerVariant): string {
  switch (variant) {
    case 'scheduled':
      return 'ring-2 ring-emerald-500/70'
    case 'done':
      return 'ring-2 ring-black/80'
    case 'backlog':
      return 'ring-2 ring-slate-400/50'
    default:
      return 'ring-2 ring-slate-400/50'
  }
}
