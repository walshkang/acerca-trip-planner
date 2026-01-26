import { NextRequest, NextResponse } from 'next/server'
import { promotePlaceCandidate } from '@/lib/staging/promotion'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { candidate_id } = await request.json()
    
    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }
    
    // Verify candidate belongs to user
    const { data: candidate } = await supabase
      .from('place_candidates')
      .select('user_id')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    
    // Promote candidate
    const placeId = await promotePlaceCandidate(candidate_id)
    
    return NextResponse.json({ place_id: placeId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
