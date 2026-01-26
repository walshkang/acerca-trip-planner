import { NextRequest, NextResponse } from 'next/server'
import { normalizeEnrichment } from '@/lib/server/enrichment/normalize'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { candidate_id, schema_version = 1 } = await request.json()
    
    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }
    
    // Fetch candidate
    const { data: candidate, error: fetchError } = await supabase
      .from('place_candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    
    // Normalize enrichment
    const enrichment = await normalizeEnrichment({
      rawSourceSnapshot: candidate.raw_payload,
      schemaVersion: schema_version,
    })
    
    // Update candidate with enrichment_id
    await supabase
      .from('place_candidates')
      .update({
        enrichment_id: enrichment.id,
        status: 'enriched',
      })
      .eq('id', candidate_id)
    
    const { id, ...enrichmentResponse } = enrichment
    return NextResponse.json({ enrichment: enrichmentResponse })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
