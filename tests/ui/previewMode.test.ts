import { describe, expect, it } from 'vitest'
import { derivePreviewMode } from '@/lib/ui/previewMode'

describe('derivePreviewMode', () => {
  it('returns none when no selected result', () => {
    expect(
      derivePreviewMode({
        previewSelectedResultId: null,
        isSubmitting: true,
        hasPreviewCandidate: false,
      })
    ).toBe('none')
  })

  it('returns loading while ingest is in flight', () => {
    expect(
      derivePreviewMode({
        previewSelectedResultId: 'ChI-test',
        isSubmitting: true,
        hasPreviewCandidate: false,
      })
    ).toBe('loading')
  })

  it('returns error when ingest finished but no candidate exists', () => {
    expect(
      derivePreviewMode({
        previewSelectedResultId: 'ChI-test',
        isSubmitting: false,
        hasPreviewCandidate: false,
      })
    ).toBe('error')
  })

  it('returns ready when candidate exists, even if isSubmitting remains true', () => {
    expect(
      derivePreviewMode({
        previewSelectedResultId: 'ChI-test',
        isSubmitting: true,
        hasPreviewCandidate: true,
      })
    ).toBe('ready')
  })
})

