import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/lists/join — Join a list via share token
 *
 * Body: { token: string }
 * Flow: validates token → ensures user is authenticated (anonymous OK)
 *       → creates list_collaborators row → returns list ID for redirect
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // If not authenticated at all, try anonymous sign-in
      const { data: anonData, error: anonError } =
        await supabase.auth.signInAnonymously()
      if (anonError || !anonData.user) {
        return NextResponse.json(
          { error: 'Could not create anonymous session' },
          { status: 500 }
        )
      }
      // Re-run with the new session — but since we're in an API route,
      // we need to use the now-authenticated client
    }

    // Re-fetch user (may be the newly created anonymous user)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { token?: unknown }
    const token = body.token
    if (typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Look up the share
    const { data: share, error: shareError } = await supabase
      .from('list_shares')
      .select('id, list_id, permission, expires_at')
      .eq('token', token.trim())
      .single()

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      )
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This share link has expired' },
        { status: 410 }
      )
    }

    // Don't let the owner join their own list as collaborator
    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', share.list_id)
      .single()

    if (list?.user_id === currentUser.id) {
      return NextResponse.json({
        list_id: share.list_id,
        already_owner: true,
      })
    }

    // Upsert collaborator (idempotent — re-joining is fine)
    const { error: collabError } = await supabase
      .from('list_collaborators')
      .upsert(
        {
          list_id: share.list_id,
          user_id: currentUser.id,
          joined_via_share_id: share.id,
        },
        { onConflict: 'list_id,user_id' }
      )

    if (collabError) {
      return NextResponse.json(
        { error: collabError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      list_id: share.list_id,
      permission: share.permission,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
