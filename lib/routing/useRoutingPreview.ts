'use client'

import { useEffect, useReducer, useRef } from 'react'
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

const ROUTING_PREVIEW_DEBOUNCE_MS = 300
const ROUTING_PREVIEW_DEBUG_LS_KEY = 'acerca_debug_routing_preview'

/** Server returned provider_unavailable for this list+day; skip repeat POSTs until navigation reloads module. */
const routingPreviewUnavailableKeys = new Set<string>()

function routingPreviewCacheKey(listId: string, date: string): string {
  return `${listId}\0${date}`
}

function routingPreviewDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ROUTING_PREVIEW_DEBUG_LS_KEY) === '1'
  } catch {
    return false
  }
}

function routingPreviewDebug(
  phase: string,
  payload: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'production') return
  if (!routingPreviewDebugEnabled()) return
  console.debug(`[useRoutingPreview] ${phase}`, payload)
}

/** Stable empties so reset paths can bail out instead of forcing a render every effect run. */
const EMPTY_ROUTING_LEGS: RoutingComputedLeg[] = []
const EMPTY_LEGS_BY_TO_ITEM_ID = new Map<string, RoutingComputedLeg>()

type PreviewState = {
  legs: RoutingComputedLeg[]
  legsByToItemId: Map<string, RoutingComputedLeg>
  summary: RoutingPreviewSummary | null
  status: RoutingPreviewStatus
  error: string | null
}

const initialPreviewState: PreviewState = {
  legs: EMPTY_ROUTING_LEGS,
  legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
  summary: null,
  status: 'idle',
  error: null,
}

type PreviewAction =
  | { type: 'loading' }
  | {
      type: 'ok'
      legs: RoutingComputedLeg[]
      summary: RoutingPreviewSummary | null
    }
  | { type: 'insufficient_items'; summary: RoutingPreviewSummary | null }
  | { type: 'provider_unavailable' }
  | { type: 'provider_error'; message: string }
  | { type: 'error'; message: string }

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'provider_unavailable': {
      if (
        state.status === 'provider_unavailable' &&
        state.error === null &&
        state.summary === null &&
        state.legs === EMPTY_ROUTING_LEGS &&
        state.legsByToItemId === EMPTY_LEGS_BY_TO_ITEM_ID
      ) {
        return state
      }
      return {
        legs: EMPTY_ROUTING_LEGS,
        legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
        summary: null,
        status: 'provider_unavailable',
        error: null,
      }
    }
    case 'loading': {
      if (state.status === 'loading' && state.error === null) return state
      return { ...state, status: 'loading', error: null }
    }
    case 'ok': {
      const legs = action.legs
      const map = buildLegsByToItemId(legs)
      return {
        legs,
        legsByToItemId: map,
        summary: action.summary,
        status: 'ok',
        error: null,
      }
    }
    case 'insufficient_items': {
      if (
        state.status === 'insufficient_items' &&
        state.error === null &&
        state.legs === EMPTY_ROUTING_LEGS &&
        state.legsByToItemId === EMPTY_LEGS_BY_TO_ITEM_ID &&
        state.summary === action.summary
      ) {
        return state
      }
      return {
        legs: EMPTY_ROUTING_LEGS,
        legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
        summary: action.summary,
        status: 'insufficient_items',
        error: null,
      }
    }
    case 'provider_error': {
      if (
        state.status === 'provider_error' &&
        state.error === action.message &&
        state.legs === EMPTY_ROUTING_LEGS &&
        state.summary === null
      ) {
        return state
      }
      return {
        legs: EMPTY_ROUTING_LEGS,
        legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
        summary: null,
        status: 'provider_error',
        error: action.message,
      }
    }
    case 'error': {
      if (state.status === 'error' && state.error === action.message) return state
      return {
        ...state,
        status: 'error',
        error: action.message,
      }
    }
    default:
      return state
  }
}

function buildLegsByToItemId(
  legs: RoutingComputedLeg[]
): Map<string, RoutingComputedLeg> {
  const map = new Map<string, RoutingComputedLeg>()
  for (const leg of legs) {
    map.set(leg.to_item_id, leg)
  }
  return map
}

/** Preview off (no list/day or fewer than 2 stops): no reducer updates — avoids effect/store feedback. */
const DISABLED_PREVIEW_RESULT: UseRoutingPreviewResult = {
  legs: EMPTY_ROUTING_LEGS,
  legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
  summary: null,
  status: 'idle',
  isLoading: false,
  error: null,
}

/** Stable return when module cache says provider_unavailable — no effect dispatch (avoids update-depth loops). */
const CACHED_PROVIDER_UNAVAILABLE_RESULT: UseRoutingPreviewResult = {
  legs: EMPTY_ROUTING_LEGS,
  legsByToItemId: EMPTY_LEGS_BY_TO_ITEM_ID,
  summary: null,
  status: 'provider_unavailable',
  isLoading: false,
  error: null,
}

export function useRoutingPreview(
  listId: string | null,
  date: string | null,
  enabled: boolean
): UseRoutingPreviewResult {
  const [state, dispatch] = useReducer(previewReducer, initialPreviewState)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cacheKey =
    listId && date && enabled ? routingPreviewCacheKey(listId, date) : null
  const blockedByModuleCache = Boolean(
    cacheKey && routingPreviewUnavailableKeys.has(cacheKey)
  )

  useEffect(() => {
    const clearDebounce = () => {
      if (debounceRef.current != null) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }

    if (!listId || !date || !enabled) {
      clearDebounce()
      abortRef.current?.abort()
      // UI is derived in render (DISABLED_PREVIEW_RESULT); do not dispatch → no update loops.
      routingPreviewDebug('skip_disabled', { listId, date, enabled })
      return
    }

    const key = routingPreviewCacheKey(listId, date)
    if (routingPreviewUnavailableKeys.has(key)) {
      clearDebounce()
      abortRef.current?.abort()
      // Do not dispatch: UI is derived in render via blockedByModuleCache (no setState → no loops).
      routingPreviewDebug('skip_cached_provider_unavailable', {
        listId,
        date,
        enabled,
      })
      return
    }

    routingPreviewDebug('debounce_scheduled', {
      listId,
      date,
      enabled,
      ms: ROUTING_PREVIEW_DEBOUNCE_MS,
    })

    clearDebounce()
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      dispatch({ type: 'loading' })

      void (async () => {
        try {
          const res = await fetch(`/api/lists/${listId}/routing/preview`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ date, mode: 'scheduled' }),
            signal: controller.signal,
          })

          if (controller.signal.aborted) return

          const json = (await res.json().catch(() => null)) as
            | RoutingPreviewResponse
            | null

          if (controller.signal.aborted) return

          if (!json) {
            dispatch({
              type: 'error',
              message: 'Failed to parse routing response',
            })
            return
          }

          const responseStatus = (json as { status?: string }).status

          if (responseStatus === 'ok') {
            routingPreviewUnavailableKeys.delete(key)
            const payload = json as RoutingPreviewSuccessPayload
            dispatch({
              type: 'ok',
              legs: payload.legs,
              summary: payload.summary,
            })
            return
          }

          if (responseStatus === 'insufficient_items') {
            dispatch({
              type: 'insufficient_items',
              summary:
                (json as RoutingPreviewInsufficientPayload).summary ?? null,
            })
            return
          }

          if (responseStatus === 'provider_unavailable') {
            routingPreviewUnavailableKeys.add(key)
            dispatch({ type: 'provider_unavailable' })
            return
          }

          const code = (json as { code?: string }).code
          if (code === 'routing_provider_bad_gateway') {
            dispatch({
              type: 'provider_error',
              message:
                (json as { message?: string }).message ?? 'Route unavailable',
            })
            return
          }

          dispatch({
            type: 'error',
            message:
              (json as { message?: string }).message ?? `HTTP ${res.status}`,
          })
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return
          dispatch({
            type: 'error',
            message:
              err instanceof Error ? err.message : 'Routing request failed',
          })
        }
      })()
    }, ROUTING_PREVIEW_DEBOUNCE_MS)

    return () => {
      clearDebounce()
      abortRef.current?.abort()
    }
  }, [listId, date, enabled])

  if (!listId || !date || !enabled) {
    return DISABLED_PREVIEW_RESULT
  }

  if (blockedByModuleCache) {
    return CACHED_PROVIDER_UNAVAILABLE_RESULT
  }

  return {
    legs: state.legs,
    legsByToItemId: state.legsByToItemId,
    summary: state.summary,
    status: state.status,
    isLoading: state.status === 'loading',
    error: state.error,
  }
}
