import { adminSupabase } from '@/lib/supabase/admin'

type LinkCandidateEnrichmentInput = {
  candidateId: string
  userId: string
  enrichmentId: string
}

export async function linkCandidateEnrichment({
  candidateId,
  userId,
  enrichmentId,
}: LinkCandidateEnrichmentInput): Promise<void> {
  const { data, error } = await adminSupabase
    .from('place_candidates')
    .update({
      enrichment_id: enrichmentId,
      status: 'enriched',
    })
    .eq('id', candidateId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(
      `Failed to link candidate enrichment: ${error.message || 'Unknown error'}`
    )
  }

  if (!data?.id) {
    throw new Error('Failed to link candidate enrichment: candidate not found')
  }
}
