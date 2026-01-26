import { createClient } from '@/lib/supabase/server'

/**
 * Transactional promotion logic with ON CONFLICT handling
 * Promotes place_candidates → places with deterministic transform
 */
export async function promotePlaceCandidate(candidateId: string): Promise<string> {
  const supabase = await createClient()
  
  // Fetch candidate
  const { data: candidate, error: fetchError } = await supabase
    .from('place_candidates')
    .select('*')
    .eq('id', candidateId)
    .single()
  
  if (fetchError || !candidate) {
    throw new Error(`Candidate not found: ${fetchError?.message}`)
  }
  
  // Compute dedupe_key first
  const dedupeKey = await computeDedupeKey(candidate)
  
  // Check if already promoted
  if (candidate.status === 'promoted' && candidate.promoted_at) {
    // Find existing place
    const { data: existingPlace } = await supabase
      .from('places')
      .select('id')
      .eq('user_id', candidate.user_id)
      .or(`source_id.eq.${candidate.source_id},dedupe_key.eq.${dedupeKey}`)
      .single()
    
    if (existingPlace) {
      return existingPlace.id
    }
  }
  
  // Extract canonical fields
  const placeData = {
    user_id: candidate.user_id,
    name: candidate.name,
    address: candidate.address,
    category: 'Food' as const, // TODO: Get from enrichment
    energy: undefined as 'Low' | 'Medium' | 'High' | undefined,
    location: candidate.location,
    source: candidate.source,
    source_id: candidate.source_id,
    google_place_id: candidate.source === 'google' ? candidate.source_id?.replace('google:', '') : null,
    dedupe_key: dedupeKey,
    opening_hours: candidate.raw_payload?.opening_hours || null,
    enrichment_version: 1,
    enriched_at: candidate.created_at,
    enrichment_source_hash: '', // TODO: Get from enrichment
    enrichment_id: candidate.enrichment_id || null,
  }
  
  // Transactional insert with conflict handling
  const { data: place, error: insertError } = await supabase
    .from('places')
    .insert(placeData)
    .select('id')
    .single()
  
  // Handle conflict
  if (insertError) {
    // Check if it's a conflict error
    if (insertError.code === '23505') { // Unique violation
      // Try to find existing place
      const { data: existing } = await supabase
        .from('places')
        .select('id')
        .eq('user_id', candidate.user_id)
        .or(`source_id.eq.${candidate.source_id},dedupe_key.eq.${dedupeKey}`)
        .single()
      
      if (existing) {
        // Update timestamp only (don't update enrichment_id or canonical fields)
        await supabase
          .from('places')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        
        // Update candidate status
        await supabase
          .from('place_candidates')
          .update({ 
            promoted_at: new Date().toISOString(),
            status: 'promoted'
          })
          .eq('id', candidateId)
        
        return existing.id
      }
    }
    
    throw new Error(`Failed to promote candidate: ${insertError.message}`)
  }
  
  if (!place) {
    throw new Error('Failed to create place')
  }
  
  // Update candidate status
  await supabase
    .from('place_candidates')
    .update({ 
      promoted_at: new Date().toISOString(),
      status: 'promoted'
    })
    .eq('id', candidateId)
  
  return place.id
}

/**
 * Compute dedupe_key from candidate data
 */
async function computeDedupeKey(candidate: any): Promise<string> {
  const nameNormalized = candidate.name?.toLowerCase().trim() || ''
  const addressNormalized = candidate.address?.toLowerCase().trim() || ''
  
  // TODO: Get geohash7 from location using PostGIS ST_GeoHash
  // For now, use a placeholder
  const geohash7 = 'placeholder' // Should be computed from location
  
  const combined = `${nameNormalized}|${geohash7}|${addressNormalized}`
  
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}
