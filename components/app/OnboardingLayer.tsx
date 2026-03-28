'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useOnboardingStore } from '@/lib/state/useOnboardingStore'
import { useNavStore } from '@/lib/state/useNavStore'
import { useTripStore } from '@/lib/state/useTripStore'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import OnboardingTooltip from '@/components/ui/OnboardingTooltip'

type TipDef = {
  id: string
  anchorId: string
  text: string
  trigger: () => boolean
}

function useTipDefs(): TipDef[] {
  const mode = useNavStore((s) => s.mode)
  const activeListItems = useTripStore((s) => s.activeListItems)
  const activeListPlaceIds = useTripStore((s) => s.activeListPlaceIds)
  const previewCandidate = useDiscoveryStore((s) => s.previewCandidate)
  const selectedResultId = useDiscoveryStore((s) => s.selectedResultId)
  const dismissedTips = useOnboardingStore((s) => s.dismissedTips)

  const hasPreview = Boolean(previewCandidate || selectedResultId)
  const placeCount = activeListPlaceIds.length
  const backlogItems = activeListItems.filter((i) => !i.scheduled_date)
  const scheduledItems = activeListItems.filter((i) => i.scheduled_date)
  const hasVisitedPlan = dismissedTips.has('backlog-drag') || dismissedTips.has('map-follows')

  return useMemo(
    () => [
      {
        id: 'search-first',
        anchorId: 'omnibox',
        text: 'Paste a Google Maps link or search for a place to get started.',
        trigger: () => mode === 'explore' && placeCount === 0 && !hasPreview,
      },
      {
        id: 'approve-pin',
        anchorId: 'approve-pin',
        text: 'This is a preview. Approve to add it to your trip.',
        trigger: () => mode === 'explore' && Boolean(previewCandidate),
      },
      {
        id: 'switch-to-plan',
        anchorId: 'itinerary-tab',
        text: 'Ready to plan? Switch to Itinerary to organize your trip.',
        trigger: () => mode === 'explore' && placeCount >= 3 && !hasVisitedPlan,
      },
      {
        id: 'backlog-drag',
        anchorId: 'planner-backlog',
        text: 'Drag places from here onto a day to schedule them.',
        trigger: () => mode === 'plan' && backlogItems.length > 0,
      },
      {
        id: 'map-follows',
        anchorId: 'map-inset',
        text: 'The map shows where your day takes you.',
        trigger: () => mode === 'plan' && scheduledItems.length > 0 && backlogItems.length >= 0,
      },
      {
        id: 'filters-hint',
        anchorId: 'filter-panel',
        text: 'Use filters to narrow by category, vibe, or energy.',
        trigger: () => mode === 'explore' && placeCount >= 5,
      },
    ],
    [mode, placeCount, hasPreview, previewCandidate, hasVisitedPlan, backlogItems.length, scheduledItems.length]
  )
}

export default function OnboardingLayer() {
  const dismissedTips = useOnboardingStore((s) => s.dismissedTips)
  const tipsDisabled = useOnboardingStore((s) => s.tipsDisabled)
  const hydrated = useOnboardingStore((s) => s.hydrated)
  const dismiss = useOnboardingStore((s) => s.dismiss)
  const disableAll = useOnboardingStore((s) => s.disableAll)
  const hydrate = useOnboardingStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const tips = useTipDefs()

  const activeTip = useMemo(() => {
    if (!hydrated || tipsDisabled) return null
    return tips.find((t) => !dismissedTips.has(t.id) && t.trigger()) ?? null
  }, [hydrated, tipsDisabled, tips, dismissedTips])

  const handleDismiss = useCallback(() => {
    if (activeTip) dismiss(activeTip.id)
  }, [activeTip, dismiss])

  const handleDisableAll = useCallback(() => {
    disableAll()
  }, [disableAll])

  if (!activeTip) return null

  return (
    <OnboardingTooltip
      key={activeTip.id}
      anchorId={activeTip.anchorId}
      text={activeTip.text}
      onDismiss={handleDismiss}
      onDisableAll={handleDisableAll}
    />
  )
}
