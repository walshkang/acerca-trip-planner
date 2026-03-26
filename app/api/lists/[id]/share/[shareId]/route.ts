import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/lists/[id]/share/[shareId] — Revoke a share link (owner only)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const { id: listId, shareId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS ensures only the owner (created_by) can delete
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('id', shareId)
      .eq('list_id', listId)
      .eq('created_by', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also remove any collaborators who joined via this specific share
    await supabase
      .from('list_collaborators')
      .delete()
      .eq('joined_via_share_id', shareId)

    return NextResponse.json({ ok: true })
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
