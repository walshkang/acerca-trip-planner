import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserSocialSourceRow, UserSocialSourcesGetResponse } from '@/lib/social/user-sources-contract'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('list_user_social_sources')
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sources = (data ?? []) as UserSocialSourceRow[]
    const body: UserSocialSourcesGetResponse = { sources }
    return NextResponse.json(body)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      source_id?: unknown
    } | null

    const raw = body?.source_id
    if (typeof raw !== 'string' || !isUuid(raw)) {
      return NextResponse.json({ error: 'source_id must be a valid UUID' }, { status: 400 })
    }

    const { error } = await supabase.from('user_social_sources').upsert(
      { user_id: user.id, source_id: raw },
      { onConflict: 'user_id,source_id', ignoreDuplicates: true }
    )

    if (error) {
      const msg = error.message ?? ''
      if (
        msg.includes('foreign key') ||
        msg.includes('user_social_sources_source_id_fkey')
      ) {
        return NextResponse.json({ error: 'Invalid source_id' }, { status: 400 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
