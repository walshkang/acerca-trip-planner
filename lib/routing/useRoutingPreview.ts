'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  RoutingComputedLeg,
  RoutingPreviewSummary,
  RoutingPreviewSuccessPayload,
  RoutingPreviewProviderUnavailablePayload,
  RoutingPreviewInsufficientPayload,
} from '@/lib/routing/contract'

export type RoutingPreviewStatus =
  | 'idle'
  | 'loading'
  | 'ok'
  | 'insufficient_items'
  | 'provider_unavailable'
  | 'provider_error'
  | 'error'

export type UseRoutingPreviewResult = {
  legs: RoutingComputedLeg[]
  legsByToItemId: Map<string, RoutingComputedLeg>
  summary: RoutingPreviewSummary | null
  status: RoutingPreviewStatus
  isLoading: boolean
  error: string | null
}

type RoutingPreviewResponse =
  | RoutingPreviewSuccessPayload
  | RoutingPreviewProviderUnavailablePayload
  | RoutingPreviewInsufficientPayload
  | { status: string; code?: string; message?: string }

function buildLegsByToItemId(
  legs: RoutingComputedLeg[]
): Map<string, RoutingComputedLeg> {
  const map = new Map<string, RoutingComputedLeg>()
  for (const leg of legs) {
    map.set(leg.to_item_id, leg)
  }
  return map
}

export function useRoutingPreview(
  listId: string | null,
  date: string | null,
  enabled: boolean
): UseRoutingPreviewResult {
  const [legs, setLegs] = useState<RoutingComputedLeg[]>([])
  const [legsByToItemId, setLegsByToItemId] = useState<
    Map<string, RoutingComputedLeg>
  >(new Map())
  const [summary, setSummary] = useState<RoutingPreviewSummary | null>(null)
  const [status, setStatus] = useState<RoutingPreviewStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchRouting = useCallback(async () => {
    if (!listId || !date || !enabled) {
      setStatus('idle')
      setLegs([])
      setLegsByToItemId(new Map())
      setSummary(null)
      setError(null)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setError(null)

    try {
      const res = await fetch(`/api/lists/${listId}/routing/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, mode: 'scheduled' }),
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const json = (await res.json().catch(() => null)) as RoutingPreviewResponse | null

      if (controller.signal.aborted) return

      if (!json) {
        setStatus('error')
        setError('Failed to parse routing response')
        return
      }

      const responseStatus = (json as { status?: string }).status

      if (responseStatus === 'ok') {
        const payload = json as RoutingPreviewSuccessPayload
        const computedLegs = payload.legs
        setLegs(computedLegs)
        setLegsByToItemId(buildLegsByToItemId(computedLegs))
        setSummary(payload.summary)
        setStatus('ok')
        setError(null)
        return
      }

      if (responseStatus === 'insufficient_items') {
        setLegs([])
        setLegsByToItemId(new Map())
        setSummary((json as RoutingPreviewInsufficientPayload).summary ?? null)
        setStatus('insufficient_items')
        setError(null)
        return
      }

      if (responseStatus === 'provider_unavailable') {
        setLegs([])
        setLegsByToItemId(new Map())
        setSummary(null)
        setStatus('provider_unavailable')
        setError(null)
        return
      }

      const code = (json as { code?: string }).code
      if (code === 'routing_provider_bad_gateway') {
        setLegs([])
        setLegsByToItemId(new Map())
        setSummary(null)
        setStatus('provider_error')
        setError((json as { message?: string }).message ?? 'Route unavailable')
        return
      }

      setStatus('error')
      setError((json as { message?: string }).message ?? `HTTP ${res.status}`)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Routing request failed')
    }
  }, [listId, date, enabled])

  useEffect(() => {
    fetchRouting()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchRouting])

  return {
    legs,
    legsByToItemId,
    summary,
    status,
    isLoading: status === 'loading',
    error,
  }
}
