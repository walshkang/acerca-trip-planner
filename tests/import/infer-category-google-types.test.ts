import { describe, expect, it } from 'vitest'
import { inferCategoryFromGoogleTypes } from '@/lib/places/infer-category-from-google-types'

describe('inferCategoryFromGoogleTypes', () => {
  it('maps restaurant to Food', () => {
    expect(inferCategoryFromGoogleTypes(['restaurant', 'food', 'point_of_interest'])).toBe(
      'Food'
    )
  })

  it('maps cafe to Coffee', () => {
    expect(inferCategoryFromGoogleTypes(['cafe'])).toBe('Coffee')
  })

  it('maps museum to Sights', () => {
    expect(inferCategoryFromGoogleTypes(['museum'])).toBe('Sights')
  })

  it('maps bar to Drinks', () => {
    expect(inferCategoryFromGoogleTypes(['bar'])).toBe('Drinks')
  })

  it('maps store to Shop', () => {
    expect(inferCategoryFromGoogleTypes(['store'])).toBe('Shop')
  })

  it('defaults to Activity', () => {
    expect(inferCategoryFromGoogleTypes(['gym'])).toBe('Activity')
    expect(inferCategoryFromGoogleTypes([])).toBe('Activity')
    expect(inferCategoryFromGoogleTypes(null)).toBe('Activity')
  })
})
