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
  id: string;
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
 * 3. Canonicalized hash: stable key order, all nested keys preserved
 * 4. Store model + prompt_version for auditability
 * 
 * Idempotency: Same sourceHash + schemaVersion → same normalizedData
 */

type JSONValue =
  | null
  | boolean
  | number
  | string
  | JSONValue[]
  | { [key: string]: JSONValue }

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Recursively canonicalize raw source snapshot for consistent hashing
 * - Stable key order (recursively sorts object keys at all nesting levels)
 * - Preserves array order (arrays are not sorted)
 * - Strings preserved exactly as-is (no whitespace normalization)
 * - Explicit conversions: undefined → null, Date → ISO string, BigInt → string
 * - Rejects functions and symbols (throws error)
 */
export function canonicalizeSnapshot(
  snapshot: EnrichmentInput['rawSourceSnapshot']
): string {
  const normalize = (value: unknown): JSONValue => {
    // Handle null
    if (value === null) return null

    // Handle primitives (preserved as-is)
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      // Handle NaN and Infinity deterministically
      if (!Number.isFinite(value)) return String(value)
      return value
    }
    if (typeof value === 'string') {
      // Preserve strings exactly as-is (no whitespace normalization)
      return value
    }

    // Handle arrays (preserve order)
    if (Array.isArray(value)) {
      return value.map((v) => normalize(v))
    }

    // Handle objects (sort keys recursively)
    if (isPlainObject(value)) {
      const keys = Object.keys(value).sort()
      const out: Record<string, JSONValue> = {}
      for (const k of keys) {
        out[k] = normalize(value[k])
      }
      return out
    }

    // Handle undefined → null
    if (value === undefined) {
      return null
    }

    // Handle Date → ISO string
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle BigInt → string
    if (typeof value === 'bigint') {
      return String(value) // e.g., "123n" format
    }

    // Reject functions and symbols (throw error)
    if (typeof value === 'function') {
      throw new Error('Cannot canonicalize function: functions are not allowed in source snapshots')
    }
    if (typeof value === 'symbol') {
      throw new Error('Cannot canonicalize symbol: symbols are not allowed in source snapshots')
    }

    // Fallback: stringify unknown types deterministically
    return String(value)
  }

  // Normalize the whole snapshot, then stringify without replacer
  return JSON.stringify(normalize(snapshot))
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
