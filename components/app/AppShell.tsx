'use client'

import { useNavStore } from '@/lib/state/useNavStore'
import ExploreShell from '@/components/app/ExploreShell'
import PlannerShell from '@/components/app/PlannerShell'

/**
 * AppShell — top-level journey router.
 *
 * Reads the active journey mode from useNavStore and renders
 * either ExploreShell (map + discovery) or PlannerShell (day grid + map inset).
 *
 * NavRail (desktop) and NavFooter (mobile) will be added here
 * to provide always-visible mode switching.
 */
export default function AppShell() {
  const mode = useNavStore((s) => s.mode)

  return (
    <div className="relative h-screen w-full">
      {mode === 'plan' ? <PlannerShell /> : <ExploreShell />}
    </div>
  )
}
