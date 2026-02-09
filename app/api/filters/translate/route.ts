import { NextResponse } from 'next/server'
import {
  emptyCanonicalServerFilters,
  parseServerFilterPayload,
  type ServerFilterFieldErrors,
} from '@/lib/filters/schema'
import { translateIntentToFilters } from '@/lib/server/filters/translate'
import { createClient } from '@/lib/supabase/server'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidFilterResponse(
  message: string,
  fieldErrors: ServerFilterFieldErrors
) {
  return NextResponse.json(
    {
      code: 'invalid_filter_payload',
      message,
      fieldErrors,
      lastValidCanonicalFilters: emptyCanonicalServerFilters(),
    },
    { status: 400 }
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as unknown
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      )
    }

    const intentValue = body.intent ?? body.query ?? body.text
    if (typeof intentValue !== 'string' || intentValue.trim().length === 0) {
      return NextResponse.json(
        { error: 'intent is required and must be a non-empty string' },
        { status: 400 }
      )
    }
    const intent = intentValue.trim().slice(0, 500)

    const rawListId = body.list_id ?? body.within_list_id
    const listId = typeof rawListId === 'string' ? rawListId : null

    if (rawListId != null && typeof rawListId !== 'string') {
      return invalidFilterResponse('list_id must be a UUID string', {
        within_list_id: ['list_id must be a UUID string'],
      })
    }

    if (listId) {
      const parsedListId = parseServerFilterPayload({ within_list_id: listId })
      if (!parsedListId.ok) {
        return invalidFilterResponse(parsedListId.message, parsedListId.fieldErrors)
      }

      const { data: list, error: listError } = await supabase
        .from('lists')
        .select('id')
        .eq('id', listId)
        .single()
      if (listError || !list) {
        if (listError?.code === 'PGRST116') {
          return NextResponse.json({ error: 'List not found' }, { status: 404 })
        }
        return NextResponse.json(
          { error: listError?.message || 'List not found' },
          { status: 404 }
        )
      }
    }

    const translated = await translateIntentToFilters({
      intent,
      listId,
    })

    const rawFilters =
      isRecord(translated.rawFilters) && listId
        ? { ...translated.rawFilters, within_list_id: listId }
        : translated.rawFilters
    const parsedFilters = parseServerFilterPayload(rawFilters)
    if (!parsedFilters.ok) {
      return invalidFilterResponse(parsedFilters.message, parsedFilters.fieldErrors)
    }

    return NextResponse.json({
      canonicalFilters: parsedFilters.canonical,
      hasAny: parsedFilters.hasAny,
      model: translated.model,
      promptVersion: translated.promptVersion,
      usedFallback: translated.usedFallback,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
