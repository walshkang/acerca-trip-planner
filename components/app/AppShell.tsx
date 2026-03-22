'use client'

import ExploreShell from '@/components/app/ExploreShell'
import NavFooter from '@/components/app/NavFooter'
import NavRail from '@/components/app/NavRail'
import PlannerShell from '@/components/app/PlannerShell'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * AppShell — top-level journey router.
 *
 * Reads the active journey mode from useNavStore and renders
 * either ExploreShell (map + discovery) or PlannerShell (day grid + map inset).
 *
 * NavRail (desktop) and NavFooter (mobile) provide persistent mode switching.
 */
export default function AppShell() {
  const mode = useNavStore((s) => s.mode)

  return (
    <div className="relative flex h-screen w-full flex-row">
      <NavRail />
      <div className="relative min-w-0 flex-1 pb-14 md:pb-0">
        {mode === 'plan' ? <PlannerShell /> : <ExploreShell />}
      </div>
      <NavFooter />
    </div>
  )
}
