// Server-only: do not import from client components
import type {
  RoutingPreviewProviderAdapter,
  RoutingProviderInput,
  RoutingProviderResult,
} from '@/lib/routing/provider'

type OsrmLeg = {
  distance: number
  duration: number
}

type OsrmRoute = {
  legs: OsrmLeg[]
}

type OsrmResponse = {
  code: string
  routes?: OsrmRoute[]
  message?: string
}

function buildCoordinates(input: RoutingProviderInput): string {
  return input.routeableSequence
    .map((item) => `${item.lng},${item.lat}`)
    .join(';')
}

async function fetchOsrmRoute(
  baseUrl: string,
  coordinates: string
): Promise<OsrmResponse> {
  const url = `${baseUrl}/route/v1/driving/${coordinates}?overview=false`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`)
  }
  return response.json() as Promise<OsrmResponse>
}

export function createOsrmAdapter(): RoutingPreviewProviderAdapter {
  return {
    provider: 'osrm',
    async preview(input: RoutingProviderInput): Promise<RoutingProviderResult> {
      const baseUrl = process.env.OSRM_BASE_URL?.trim()
      if (!baseUrl) {
        return {
          ok: false,
          code: 'provider_unavailable',
          provider: 'osrm',
          message: 'OSRM_BASE_URL is not configured.',
          retryable: false,
        }
      }

      if (input.routeableSequence.length < 2) {
        return {
          ok: true,
          provider: 'osrm',
          legs: [],
        }
      }

      const coordinates = buildCoordinates(input)
      let data: OsrmResponse
      try {
        data = await fetchOsrmRoute(baseUrl, coordinates)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'OSRM request failed'
        return {
          ok: false,
          code: 'provider_error',
          provider: 'osrm',
          message,
          retryable: true,
        }
      }

      if (!data || data.code !== 'Ok') {
        return {
          ok: false,
          code: 'provider_error',
          provider: 'osrm',
          message: `OSRM error: ${data?.code ?? 'unknown'} ${data?.message ?? ''}`.trim(),
          retryable: true,
        }
      }

      const route = data.routes?.[0]
      if (!route?.legs) {
        return {
          ok: false,
          code: 'provider_error',
          provider: 'osrm',
          message: 'OSRM response missing route legs',
          retryable: true,
        }
      }

      const legs = route.legs.map((leg, index) => ({
        index,
        distance_m: leg.distance,
        duration_s: leg.duration,
      }))

      return {
        ok: true,
        provider: 'osrm',
        legs,
      }
    },
  }
}
