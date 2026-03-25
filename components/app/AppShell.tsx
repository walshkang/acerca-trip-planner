'use client'

import ExploreShellPaper from '@/components/app/ExploreShellPaper'
import PlannerShellPaper from '@/components/app/PlannerShellPaper'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * AppShell — top-level journey router.
 *
 * All viewports use Paper-styled shells. Map / Itinerary mode switch lives in
 * PaperHeader (?mode= stays in sync via useNavStore).
 */
export default function AppShell() {
  const mode = useNavStore((s) => s.mode)

  return mode === 'plan' ? <PlannerShellPaper /> : <ExploreShellPaper />
}
