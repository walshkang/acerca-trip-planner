'use client'

import { Suspense } from 'react'
import WorkspaceContainer from '@/components/workspace/WorkspaceContainer'

export default function Home() {
  return (
    <main className="relative h-screen w-full">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-600">Loading workspace…</p>
          </div>
        }
      >
        <WorkspaceContainer />
      </Suspense>
    </main>
  )
}
