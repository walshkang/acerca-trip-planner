export type PreviewMode = 'none' | 'loading' | 'ready' | 'error'

export function derivePreviewMode(input: {
  previewSelectedResultId: string | null
  isSubmitting: boolean
  hasPreviewCandidate: boolean
}): PreviewMode {
  if (!input.previewSelectedResultId) return 'none'
  if (input.hasPreviewCandidate) return 'ready'
  if (input.isSubmitting) return 'loading'
  return 'error'
}

