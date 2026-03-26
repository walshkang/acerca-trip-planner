'use client'

import { useEffect, useState } from 'react'
import { formatPlannerFreshnessLabel } from '@/lib/lists/planner-freshness'
import { useTripStore } from '@/lib/state/useTripStore'

const TICK_MS = 30_000

export default function PlannerFreshnessLabel() {
  const lastFetchedAt = useTripStore((s) => s.lastFetchedAt)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  if (lastFetchedAt == null) return null

  const label = formatPlannerFreshnessLabel(Date.now(), lastFetchedAt)

  return (
    <span className="text-xs text-paper-on-surface-variant" title="Last loaded from server">
      Updated {label}
    </span>
  )
}
