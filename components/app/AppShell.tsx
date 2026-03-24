'use client'

import ExploreShell from '@/components/app/ExploreShell'
import ExploreShellPaper from '@/components/app/ExploreShellPaper'
import NavFooter from '@/components/app/NavFooter'
import NavRail from '@/components/app/NavRail'
import PlannerShell from '@/components/app/PlannerShell'
import PlannerShellPaper from '@/components/app/PlannerShellPaper'
import { useMediaQuery } from '@/components/ui/useMediaQuery'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * AppShell — top-level journey router.
 *
 * Desktop (≥768px): Paper-styled shells (no NavRail).
 * Mobile (<768px): Glass-styled shells with NavRail/NavFooter.
 */
export default function AppShell() {
  const mode = useNavStore((s) => s.mode)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Desktop: Paper shells — PaperHeader handles navigation
  if (isDesktop) {
    return mode === 'plan' ? <PlannerShellPaper /> : <ExploreShellPaper />
  }

  // Mobile: existing glass shells with NavRail/NavFooter
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
