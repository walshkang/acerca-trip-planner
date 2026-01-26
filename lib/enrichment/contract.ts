// Enrichment contract definition
// Deterministic enrichment with idempotency guarantees

export interface EnrichmentInput {
  rawSourceSnapshot: {
    googlePlaces: any;      // Raw Google Places API response
    wikipedia?: any;        // Wikipedia GeoSearch result
    wikidata?: any;         // Wikidata structured data
  };
  schemaVersion: number;    // Enrichment schema version
}

export interface EnrichmentOutput {
  normalizedData: {
    category: string;      // CategoryEnum
    energy?: string;        // EnergyEnum
    tags: string[];         // AI-generated tags (validated against schema)
    vibe?: string;
  };
  sourceHash: string;      // Hash of **canonicalized** rawSourceSnapshot
  model: string;            // LLM model identifier
  temperature: number;      // Must be 0
  promptVersion: string;    // System prompt/contract version (includes prompt + interpretation contract)
}

/**
 * Determinism requirements:
 * 1. temperature = 0 (or lowest allowed)
 * 2. Structured output (JSON schema / tool call) - reject invalid output
 * 3. Canonicalized hash: stable key order, normalized whitespace
 * 4. Store model + prompt_version for auditability
 * 
 * Idempotency: Same sourceHash + schemaVersion → same normalizedData
 */

/**
 * Canonicalize raw source snapshot for consistent hashing
 * - Stable key order
 * - Normalized whitespace
 */
export function canonicalizeSnapshot(snapshot: EnrichmentInput['rawSourceSnapshot']): string {
  // Sort keys recursively and normalize whitespace
  const canonical = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return canonical.replace(/\s+/g, ' ').trim();
}

/**
 * Compute source hash from canonicalized snapshot
 */
export async function computeSourceHash(snapshot: EnrichmentInput['rawSourceSnapshot']): Promise<string> {
  const canonical = canonicalizeSnapshot(snapshot);
  
  // Use Web Crypto API for hashing (works in both Node.js and browser)
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
