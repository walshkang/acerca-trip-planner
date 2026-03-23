'use client'

import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import ListPlanner from '@/components/stitch/ListPlanner'

/**
 * PlannerShell — the Plan journey shell.
 *
 * Renders ListPlanner full-screen with light tone.
 * Future: MapInset (real Mapbox minimap), desktop split-panel layout.
 */
export default function PlannerShell() {
  const activeListId = useTripStore((s) => s.activeListId)
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const setMode = useNavStore((s) => s.setMode)

  if (!activeListId) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md space-y-4 px-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Planner
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select a trip in Explore mode first, then switch to Plan.
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

  return (
    <div
      className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-900"
      data-map-tone="light"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-4">
          <ListPlanner
            listId={activeListId}
            tone="light"
            onPlanMutated={bumpListItemsRefresh}
          />
        </div>
      </div>
    </div>
  )
}
