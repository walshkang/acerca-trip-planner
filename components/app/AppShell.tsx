'use client'

import { useEffect } from 'react'
import ExploreShellPaper from '@/components/app/ExploreShellPaper'
import PlannerShellPaper from '@/components/app/PlannerShellPaper'
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * AppShell — top-level journey router.
 *
 * All viewports use Paper-styled shells. Map / Itinerary mode switch lives in
 * PaperHeader (?mode= stays in sync via useNavStore).
 */
export default function AppShell() {
  const mode = useNavStore((s) => s.mode)
  const hydrateMapLayer = useMapLayerStore((s) => s.hydrate)

  useEffect(() => {
    void hydrateMapLayer()
  }, [hydrateMapLayer])

  return mode === 'plan' ? <PlannerShellPaper /> : <ExploreShellPaper />
}
