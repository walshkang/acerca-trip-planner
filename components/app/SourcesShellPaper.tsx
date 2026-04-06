'use client'

import PaperHeader from '@/components/paper/PaperHeader'
import SourcesPanel from '@/components/stitch/SourcesPanel'
import { useNavStore } from '@/lib/state/useNavStore'

/**
 * SourcesShellPaper — Paper-styled Sources journey mode.
 */
export default function SourcesShellPaper() {
  const setMode = useNavStore((s) => s.setMode)

  return (
    <div className="flex h-screen w-full flex-col bg-paper-surface-warm">
      <PaperHeader
        activeTab="sources"
        onTabChange={(tab) => {
          if (tab === 'map') setMode('explore')
          else if (tab === 'itinerary') setMode('plan')
        }}
      />
      <div
        data-testid="sources-shell-body"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <SourcesPanel />
      </div>
    </div>
  )
}
