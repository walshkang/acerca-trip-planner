import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication using session-respecting server client
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { candidate_id, list_id } = await request.json()
    
    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }
    
    // Call RPC function (RPC handles candidate ownership check internally)
    const { data: placeId, error } = await supabase.rpc('promote_place_candidate', {
      p_candidate_id: candidate_id,
      p_list_id: list_id ?? null,
    })
    
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to promote candidate' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ place_id: placeId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
