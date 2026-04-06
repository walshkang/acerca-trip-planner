import { describe, expect, it } from 'vitest'
import { socialMarkerSizeClass } from '@/lib/social/marker-size'

describe('socialMarkerSizeClass', () => {
  it('uses base size for undefined and 1 mention', () => {
    expect(socialMarkerSizeClass(undefined)).toBe('h-9 w-9')
    expect(socialMarkerSizeClass(0)).toBe('h-9 w-9')
    expect(socialMarkerSizeClass(1)).toBe('h-9 w-9')
  })

  it('uses medium size for 2-3 mentions', () => {
    expect(socialMarkerSizeClass(2)).toBe('h-11 w-11')
    expect(socialMarkerSizeClass(3)).toBe('h-11 w-11')
  })

  it('uses large size for 4+ mentions', () => {
    expect(socialMarkerSizeClass(4)).toBe('h-13 w-13')
    expect(socialMarkerSizeClass(12)).toBe('h-13 w-13')
  })
})
