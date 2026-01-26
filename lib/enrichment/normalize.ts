import { adminSupabase } from '@/lib/supabase/admin'
import { EnrichmentInput, EnrichmentOutput, computeSourceHash } from './contract'

/**
 * Deterministic normalization (idempotent)
 * Checks if enrichment exists, otherwise creates new one
 */
export async function normalizeEnrichment(
  input: EnrichmentInput
): Promise<EnrichmentOutput> {
  const supabase = adminSupabase
  
  // Compute canonicalized hash
  const sourceHash = await computeSourceHash(input.rawSourceSnapshot)
  
  // Check if enrichment already exists (idempotency)
  const { data: existing } = await supabase
    .from('enrichments')
    .select('*')
    .eq('source_hash', sourceHash)
    .eq('schema_version', input.schemaVersion)
    .single()
  
  if (existing) {
    // Return existing enrichment
    return {
      normalizedData: existing.normalized_data,
      sourceHash: existing.source_hash,
      model: existing.model,
      temperature: existing.temperature,
      promptVersion: existing.prompt_version,
    }
  }
  
  // TODO: Call LLM normalization with:
  // - temperature = 0
  // - Structured output (JSON schema validation)
  // - System prompt (versioned)
  // - Validate output against schema (reject if invalid)
  
  // Placeholder normalized data
  const normalizedData = {
    category: 'Food', // Should be determined by LLM
    tags: [],
    vibe: undefined,
  }
  
  // Store new enrichment
  const { data: enrichment, error } = await supabase
    .from('enrichments')
    .insert({
      source_hash: sourceHash,
      schema_version: input.schemaVersion,
      normalized_data: normalizedData,
      raw_sources: input.rawSourceSnapshot,
      model: 'gpt-4-turbo', // TODO: Get from config
      temperature: 0,
      prompt_version: 'v1.0', // TODO: Get from config
    })
    .select()
    .single()
  
  if (error || !enrichment) {
    throw new Error(`Failed to create enrichment: ${error?.message}`)
  }
  
  return {
    normalizedData: enrichment.normalized_data,
    sourceHash: enrichment.source_hash,
    model: enrichment.model,
    temperature: Number(enrichment.temperature),
    promptVersion: enrichment.prompt_version,
  }
}
