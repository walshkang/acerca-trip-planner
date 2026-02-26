import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { code: 'unauthorized', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { candidate_id } = body as { candidate_id?: string }

    if (!candidate_id || typeof candidate_id !== 'string') {
      return NextResponse.json(
        { code: 'invalid_discard_payload', message: 'candidate_id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase.rpc('discard_place_candidate', {
      p_candidate_id: candidate_id,
    })

    if (error) {
      return NextResponse.json(
        {
          code: 'internal_error',
          message: error.message || 'Failed to discard candidate',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 'internal_error',
        message: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

