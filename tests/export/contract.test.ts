import { describe, expect, it } from 'vitest'
import {
  validateExportRequest,
  EXPORT_FORMAT_VALUES,
  EXPORT_SCOPE_VALUES,
  CATEGORY_EMOJI,
} from '@/lib/export/contract'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'

describe('validateExportRequest', () => {
  it('accepts a minimal valid request (format only)', () => {
    const result = validateExportRequest({ format: 'clipboard' })
    expect('request' in result).toBe(true)
    if ('request' in result) {
      expect(result.request.format).toBe('clipboard')
      expect(result.request.scope).toBe('all')
    }
  })

  it('accepts all valid formats', () => {
    for (const format of EXPORT_FORMAT_VALUES) {
      const result = validateExportRequest({ format })
      expect('request' in result).toBe(true)
    }
  })

  it('accepts all valid scopes', () => {
    for (const scope of EXPORT_SCOPE_VALUES) {
      const result = validateExportRequest({ format: 'csv', scope })
      expect('request' in result).toBe(true)
      if ('request' in result) {
        expect(result.request.scope).toBe(scope)
      }
    }
  })

  it('defaults scope to "all" when omitted', () => {
    const result = validateExportRequest({ format: 'markdown' })
    if ('request' in result) {
      expect(result.request.scope).toBe('all')
    }
  })

  it('accepts valid categories filter', () => {
    const result = validateExportRequest({ format: 'csv', categories: ['Food', 'Coffee'] })
    expect('request' in result).toBe(true)
    if ('request' in result) {
      expect(result.request.categories).toEqual(['Food', 'Coffee'])
    }
  })

  it('accepts valid tags filter', () => {
    const result = validateExportRequest({ format: 'csv', tags: ['must-try', 'brunch'] })
    expect('request' in result).toBe(true)
    if ('request' in result) {
      expect(result.request.tags).toEqual(['must-try', 'brunch'])
    }
  })

  it('rejects missing format', () => {
    const result = validateExportRequest({ scope: 'all' })
    expect('errors' in result).toBe(true)
    if ('errors' in result) {
      expect(result.errors.some((e) => e.field === 'format')).toBe(true)
    }
  })

  it('rejects invalid format value', () => {
    const result = validateExportRequest({ format: 'pdf' })
    expect('errors' in result).toBe(true)
  })

  it('rejects invalid scope value', () => {
    const result = validateExportRequest({ format: 'csv', scope: 'future' })
    expect('errors' in result).toBe(true)
    if ('errors' in result) {
      expect(result.errors.some((e) => e.field === 'scope')).toBe(true)
    }
  })

  it('rejects unknown fields', () => {
    const result = validateExportRequest({ format: 'csv', unknownField: true })
    expect('errors' in result).toBe(true)
    if ('errors' in result) {
      expect(result.errors.some((e) => e.field === 'unknownField')).toBe(true)
    }
  })

  it('rejects non-object bodies', () => {
    expect('errors' in validateExportRequest(null)).toBe(true)
    expect('errors' in validateExportRequest('string')).toBe(true)
    expect('errors' in validateExportRequest([1, 2])).toBe(true)
  })

  it('rejects non-array categories', () => {
    const result = validateExportRequest({ format: 'csv', categories: 'Food' })
    expect('errors' in result).toBe(true)
  })

  it('rejects invalid category values', () => {
    const result = validateExportRequest({ format: 'csv', categories: ['NotACategory'] })
    expect('errors' in result).toBe(true)
  })
})

describe('CATEGORY_EMOJI', () => {
  it('has an emoji for every CategoryEnum value', () => {
    for (const cat of CATEGORY_ENUM_VALUES) {
      expect(CATEGORY_EMOJI[cat]).toBeTruthy()
    }
  })
})
