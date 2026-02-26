import { NextResponse } from 'next/server'
import type { DiscoverySuggestErrorPayload } from '@/lib/discovery/contract'
import { parseDiscoverySuggestRequest } from '@/lib/discovery/contract'
import {
  buildDiscoverySuggestions,
  DiscoverySuggestServiceError,
} from '@/lib/server/discovery/suggest'
import { createClient } from '@/lib/supabase/server'

function toErrorResponse(
  status: number,
  payload: DiscoverySuggestErrorPayload
): NextResponse<DiscoverySuggestErrorPayload> {
  return NextResponse.json(payload, { status })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return toErrorResponse(401, {
        code: 'unauthorized',
        message: 'Unauthorized',
      })
    }

    const body = (await request.json().catch(() => null)) as unknown
    const parsed = parseDiscoverySuggestRequest(body)
    if (!parsed.ok) {
      return toErrorResponse(400, {
        code: 'invalid_discovery_payload',
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
        lastValidCanonicalRequest: null,
      })
    }

    const result = await buildDiscoverySuggestions({
      supabase,
      userId: user.id,
      canonical: parsed.canonical,
    })

    return NextResponse.json({
      status: 'ok' as const,
      canonicalRequest: parsed.canonical,
      canonicalFilters: result.canonicalFilters,
      suggestions: result.suggestions,
      summary: result.summary,
      meta: result.meta,
    })
  } catch (error: unknown) {
    if (error instanceof DiscoverySuggestServiceError) {
      if (error.code === 'not_found') {
        return toErrorResponse(404, {
          code: 'not_found',
          message: 'List not found',
          lastValidCanonicalRequest: error.canonicalRequest,
        })
      }
      if (error.code === 'provider_unavailable') {
        return toErrorResponse(503, {
          code: 'discovery_provider_unavailable',
          message: error.message,
          lastValidCanonicalRequest: error.canonicalRequest,
        })
      }
      if (error.code === 'provider_bad_gateway') {
        return toErrorResponse(502, {
          code: 'discovery_provider_bad_gateway',
          message: error.message,
          lastValidCanonicalRequest: error.canonicalRequest,
        })
      }
    }

    return toErrorResponse(500, {
      code: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
