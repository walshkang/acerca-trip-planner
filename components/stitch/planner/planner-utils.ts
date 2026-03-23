import type { PlannerSlot } from '@/lib/lists/planner'

export type SlotDotTone = 'warm' | 'neutral' | 'cool'

export function slotDotTone(slot: PlannerSlot | null): SlotDotTone {
  if (slot === 'morning') return 'warm'
  if (slot === 'evening') return 'cool'
  return 'neutral'
}

export function slotDotClassName(
  slot: PlannerSlot | null,
  tone: 'light' | 'dark'
): string {
  const dotTone = slotDotTone(slot)
  if (tone === 'dark') {
    if (dotTone === 'warm') return 'bg-amber-400'
    if (dotTone === 'cool') return 'bg-indigo-400'
    return 'bg-slate-400'
  }
  if (dotTone === 'warm') return 'bg-amber-500'
  if (dotTone === 'cool') return 'bg-indigo-500'
  return 'bg-slate-500'
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  const day = date.getUTCDate()
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    date.getUTCDay()
  ]
  return `${weekday} ${day}`
}

export function formatDayLabelFull(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  const day = date.getUTCDate()
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    date.getUTCDay()
  ]
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][date.getUTCMonth()]
  return `${weekday} ${month} ${day}`
}

export function slotLabel(slot: PlannerSlot | null): string {
  if (slot === 'morning') return 'AM'
  if (slot === 'evening') return 'PM'
  return 'Mid'
}

export const DAY_CAPACITY_WARN = 5
