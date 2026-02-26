import type {
  CanonicalRoutingPreviewRequest,
  RoutingLegDraft,
  RoutingProviderKind,
  RoutingProviderLegMetric,
  RoutingPreviewListContext,
  RoutingSequenceItem,
} from '@/lib/routing/contract'

export type RoutingProviderFailureCode =
  | 'provider_unavailable'
  | 'provider_error'

export type RoutingProviderInput = {
  canonicalRequest: CanonicalRoutingPreviewRequest
  list: RoutingPreviewListContext
  sequence: RoutingSequenceItem[]
  routeableSequence: RoutingSequenceItem[]
  legDrafts: RoutingLegDraft[]
}

export type RoutingProviderFailureResult = {
  ok: false
  code: RoutingProviderFailureCode
  provider: RoutingProviderKind
  message: string
  retryable: boolean
}

export type RoutingProviderSuccessResult = {
  ok: true
  provider: RoutingProviderKind
  legs: RoutingProviderLegMetric[]
}

export type RoutingProviderResult =
  | RoutingProviderFailureResult
  | RoutingProviderSuccessResult

export interface RoutingPreviewProviderAdapter {
  readonly provider: RoutingProviderKind
  preview(input: RoutingProviderInput): Promise<RoutingProviderResult>
}

const PROVIDER_VALUES: RoutingProviderKind[] = [
  'unimplemented',
  'google_routes',
  'osrm',
]

function isRoutingProviderKind(value: string): value is RoutingProviderKind {
  return PROVIDER_VALUES.includes(value as RoutingProviderKind)
}

export function resolveRoutingProviderKind(
  raw: string | null | undefined
): RoutingProviderKind {
  if (typeof raw !== 'string') return 'unimplemented'
  const normalized = raw.trim().toLowerCase()
  if (!normalized) return 'unimplemented'
  if (!isRoutingProviderKind(normalized)) return 'unimplemented'
  return normalized
}

function providerUnavailableMessage(provider: RoutingProviderKind): string {
  if (provider === 'unimplemented') {
    return 'Routing provider integration is not implemented yet.'
  }
  return `Routing provider "${provider}" is configured but not implemented yet.`
}

function createUnimplementedAdapter(
  provider: RoutingProviderKind
): RoutingPreviewProviderAdapter {
  return {
    provider,
    async preview(_: RoutingProviderInput): Promise<RoutingProviderResult> {
      return {
        ok: false,
        code: 'provider_unavailable',
        provider,
        message: providerUnavailableMessage(provider),
        retryable: false,
      }
    },
  }
}

export function getRoutingPreviewProvider(
  kindOverride?: RoutingProviderKind | string | null
): RoutingPreviewProviderAdapter {
  const providerKind = resolveRoutingProviderKind(
    kindOverride ?? process.env.ROUTING_PROVIDER
  )

  return createUnimplementedAdapter(providerKind)
}
