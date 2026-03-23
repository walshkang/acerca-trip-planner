'use client'

import { useTripStore } from '@/lib/state/useTripStore'
import { useNavStore } from '@/lib/state/useNavStore'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import ListPlanner from '@/components/stitch/ListPlanner'

/**
 * PlannerShell — the Plan journey shell.
 *
 * Desktop (≥1024px): split layout — grid/backlog left, day detail right.
 * Mobile (<1024px): single scrollable column with inline day detail.
 * Future: MapInset (real Mapbox minimap).
 */
export default function PlannerShell() {
  const activeListId = useTripStore((s) => s.activeListId)
  const bumpListItemsRefresh = useTripStore((s) => s.bumpListItemsRefresh)
  const setMode = useNavStore((s) => s.setMode)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

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

  if (isDesktop) {
    return (
      <div
        className="flex h-screen w-full flex-col bg-slate-50 dark:bg-slate-900"
        data-map-tone="light"
      >
        <div className="flex-1 min-h-0">
          <ListPlanner
            listId={activeListId}
            tone="light"
            layout="split"
            onPlanMutated={bumpListItemsRefresh}
          />
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
            layout="column"
            onPlanMutated={bumpListItemsRefresh}
          />
        </div>
      </div>
    </div>
  )
}
