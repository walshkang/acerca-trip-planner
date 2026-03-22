'use client'

import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * PlannerShell — the Plan journey shell.
 *
 * Will contain:
 * - PlannerGrid (primary surface — day grid with drag-and-drop)
 * - MapInset (real Mapbox minimap with clickable pins)
 * - PlannerToolbar (trip dates, filters)
 *
 * Currently a skeleton placeholder.
 */
export default function PlannerShell() {
  const activeListId = useTripStore((s) => s.activeListId)
  const setMode = useNavStore((s) => s.setMode)

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md space-y-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Planner
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {activeListId
            ? 'The day grid planner is coming soon. Your trip data is ready.'
            : 'Select a trip in Explore mode first, then switch to Plan.'}
        </p>
        <button
          type="button"
          onClick={() => setMode('explore')}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back to Explore
        </button>
      </div>
    </div>
  )
}
