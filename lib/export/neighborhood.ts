/**
 * Heuristic extraction of a neighborhood/sub-locality from an address string.
 *
 * Strategy: split by commas, skip the first segment (street) and last segment
 * (state/zip/country), and return the second segment for 3-part addresses or
 * the second segment for 4+ part addresses.
 *
 * Examples:
 *   "123 Main St, Williamsburg, Brooklyn, NY 11211" → "Williamsburg"
 *   "1-2-3 Shibuya, Shibuya-ku, Tokyo 150-0002"     → "Shibuya-ku"
 *   "123 Main St, New York, NY 10001"                → "New York"
 *
 * Returns null when extraction is ambiguous or address is null/empty.
 */
export function extractNeighborhood(address: string | null | undefined): string | null {
  if (!address || address.trim().length === 0) return null

  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)

  // Need at least 3 parts: street, neighborhood, state/country
  if (parts.length < 3) return null

  // Second segment (index 1) is the best heuristic for neighborhood/sub-locality
  const candidate = parts[1]
  if (!candidate || candidate.length === 0) return null

  return candidate
}
