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
      rawSourceSnapshot: (() => {
        const rawUnknown = (candidate as { raw_payload?: unknown }).raw_payload
        const raw =
          typeof rawUnknown === 'object' &&
          rawUnknown !== null &&
          !Array.isArray(rawUnknown)
            ? (rawUnknown as Record<string, unknown>)
            : {}
        const { wikipedia, wikidata, ...googlePlaces } = raw
        return {
          googlePlaces,
          ...(wikipedia ? { wikipedia } : {}),
          ...(wikidata ? { wikidata } : {}),
        }
      })(),
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
    
    return NextResponse.json({
      enrichment: {
        normalizedData: enrichment.normalizedData,
        sourceHash: enrichment.sourceHash,
        model: enrichment.model,
        temperature: enrichment.temperature,
        promptVersion: enrichment.promptVersion,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
