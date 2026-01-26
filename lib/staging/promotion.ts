import { createClient } from '@/lib/supabase/server'

/**
 * Thin wrapper for promotion RPC function
 * Promotes place_candidates → places via Postgres RPC (transactional, race-safe)
 */
export async function promotePlaceCandidate(candidateId: string): Promise<string> {
  const supabase = await createClient()
  
  const { data: placeId, error } = await supabase.rpc('promote_place_candidate', {
    p_candidate_id: candidateId,
  })
  
  if (error) {
    throw new Error(`Failed to promote candidate: ${error.message}`)
  }
  
  if (!placeId) {
    throw new Error('Promotion succeeded but no place_id returned')
  }
  
  return placeId
}
