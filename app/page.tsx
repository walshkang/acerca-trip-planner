'use client'

import { Suspense } from 'react'
import AppShell from '@/components/app/AppShell'

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      }
    >
      <AppShell />
    </Suspense>
  )
}
