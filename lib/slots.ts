/**
 * Shared Tailwind class strings for morning / afternoon / evening across map,
 * planner, and day-detail UI. Map code imports from here — not from planner components.
 */
import type { PlannerSlot } from '@/lib/lists/planner'

export type SlotOrNull = PlannerSlot | null

export type SlotVisualTone = 'light' | 'dark'

/** Vertical stripe / dot fill inside calendar lists (light = paper planner surface). */
export function slotDotClassName(
  slot: SlotOrNull,
  tone: SlotVisualTone
): string {
  if (tone === 'dark') {
    if (slot === 'morning') return 'bg-amber-400'
    if (slot === 'evening') return 'bg-indigo-400'
    if (slot === 'afternoon') return 'bg-rose-400'
    return 'bg-slate-400'
  }
  if (slot === 'morning') return 'bg-amber-500'
  if (slot === 'evening') return 'bg-indigo-500'
  if (slot === 'afternoon') return 'bg-rose-400'
  return 'bg-slate-400'
}

/** Pin ring around scheduled place markers (Mapbox + MapLibre). */
export function mapMarkerRingClasses(args: {
  completed: boolean
  hasScheduledDate: boolean
  slot: SlotOrNull
}): string {
  if (args.completed) {
    return 'ring-2 ring-black/80 dark:ring-black/90'
  }
  if (!args.hasScheduledDate) {
    return 'ring-2 ring-slate-400/50'
  }
  if (args.slot === 'morning') return 'ring-2 ring-amber-500/75'
  if (args.slot === 'afternoon') return 'ring-2 ring-rose-400/80'
  if (args.slot === 'evening') return 'ring-2 ring-indigo-500/75'
  return 'ring-2 ring-slate-400/50'
}

/** Day-detail slot section: opaque muted border at rest. */
export function slotDayDetailSectionClassRest(slot: PlannerSlot): string {
  switch (slot) {
    case 'morning':
      return 'border-2 border-amber-500/45'
    case 'afternoon':
      return 'border-2 border-rose-400/45'
    case 'evening':
      return 'border-2 border-indigo-500/45'
  }
}

/** Day-detail slot section: full-strength border while user is dragging. */
export function slotDayDetailSectionClassDragging(slot: PlannerSlot): string {
  switch (slot) {
    case 'morning':
      return 'border-2 border-amber-500'
    case 'afternoon':
      return 'border-2 border-rose-500'
    case 'evening':
      return 'border-2 border-indigo-500'
  }
}

/** Strong ring when pointer is over this slot during drag. */
export function slotDayDetailSectionDropOverRing(slot: PlannerSlot): string {
  switch (slot) {
    case 'morning':
      return 'ring-2 ring-amber-500 ring-offset-2 ring-offset-paper-surface-warm'
    case 'afternoon':
      return 'ring-2 ring-rose-500 ring-offset-2 ring-offset-paper-surface-warm'
    case 'evening':
      return 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-paper-surface-warm'
  }
}
