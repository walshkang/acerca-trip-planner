import { describe, expect, it } from 'vitest'
import { extractNeighborhood } from '@/lib/export/neighborhood'

describe('extractNeighborhood', () => {
  it('extracts sub-locality from a 4-part US address', () => {
    expect(extractNeighborhood('123 Main St, Williamsburg, Brooklyn, NY 11211')).toBe(
      'Williamsburg'
    )
  })

  it('extracts neighborhood from a 3-part address', () => {
    expect(extractNeighborhood('123 Main St, New York, NY 10001')).toBe('New York')
  })

  it('extracts sub-locality from a Japanese address', () => {
    expect(extractNeighborhood('1-2-3 Shibuya, Shibuya-ku, Tokyo 150-0002')).toBe(
      'Shibuya-ku'
    )
  })

  it('returns null for a 2-part address (ambiguous)', () => {
    expect(extractNeighborhood('Some Street, New York')).toBeNull()
  })

  it('returns null for a 1-part address', () => {
    expect(extractNeighborhood('New York')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(extractNeighborhood(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractNeighborhood('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(extractNeighborhood('   ')).toBeNull()
  })

  it('trims whitespace from segments', () => {
    expect(extractNeighborhood('  123 Main St ,  Greenpoint , Brooklyn , NY 11222')).toBe(
      'Greenpoint'
    )
  })
})
