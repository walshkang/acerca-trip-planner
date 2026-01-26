import { NextRequest, NextResponse } from 'next/server'
import { normalizeEnrichment } from '@/lib/enrichment/normalize'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

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
    
    // Get enrichment ID from database
    const { data: enrichmentRecord } = await adminSupabase
      .from('enrichments')
      .select('id')
      .eq('source_hash', enrichment.sourceHash)
      .eq('schema_version', schema_version)
      .single()
    
    if (!enrichmentRecord) {
      return NextResponse.json({ error: 'Failed to find enrichment record' }, { status: 500 })
    }
    
    // Update candidate with enrichment_id
    await supabase
      .from('place_candidates')
      .update({
        enrichment_id: enrichmentRecord.id,
        status: 'enriched',
      })
      .eq('id', candidate_id)
    
    return NextResponse.json({ enrichment })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
