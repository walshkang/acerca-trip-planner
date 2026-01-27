import { adminSupabase } from '@/lib/supabase/admin'

export async function getEnrichmentById(enrichmentId: string): Promise<{
  id: string
  normalized_data: unknown
  curated_data: unknown | null
  raw_sources: unknown
  model: string
  temperature: number
  prompt_version: string
  created_at: string
} | null> {
  const { data, error } = await adminSupabase
    .from('enrichments')
    .select(
      'id, normalized_data, curated_data, raw_sources, model, temperature, prompt_version, created_at'
    )
    .eq('id', enrichmentId)
    .single()

  if (error || !data) return null
  return data as unknown as {
    id: string
    normalized_data: unknown
    curated_data: unknown | null
    raw_sources: unknown
    model: string
    temperature: number
    prompt_version: string
    created_at: string
  }
}
