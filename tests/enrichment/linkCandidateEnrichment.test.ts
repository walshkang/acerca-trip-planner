import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fromMock,
  updateMock,
  eqCandidateMock,
  eqUserMock,
  selectMock,
  maybeSingleMock,
} = vi.hoisted(() => {
  const maybeSingleMock = vi.fn()
  const selectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }))
  const eqUserMock = vi.fn(() => ({ select: selectMock }))
  const eqCandidateMock = vi.fn(() => ({ eq: eqUserMock }))
  const updateMock = vi.fn(() => ({ eq: eqCandidateMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  return {
    fromMock,
    updateMock,
    eqCandidateMock,
    eqUserMock,
    selectMock,
    maybeSingleMock,
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  adminSupabase: {
    from: fromMock,
  },
}))

import { linkCandidateEnrichment } from '@/lib/server/enrichment/linkCandidateEnrichment'

describe('linkCandidateEnrichment', () => {
  beforeEach(() => {
    fromMock.mockClear()
    updateMock.mockClear()
    eqCandidateMock.mockClear()
    eqUserMock.mockClear()
    selectMock.mockClear()
    maybeSingleMock.mockReset()
  })

  it('updates candidate with enrichment link', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'candidate-1' },
      error: null,
    })

    await expect(
      linkCandidateEnrichment({
        candidateId: 'candidate-1',
        userId: 'user-1',
        enrichmentId: 'enrichment-1',
      })
    ).resolves.toBeUndefined()

    expect(fromMock).toHaveBeenCalledWith('place_candidates')
    expect(updateMock).toHaveBeenCalledWith({
      enrichment_id: 'enrichment-1',
      status: 'enriched',
    })
    expect(eqCandidateMock).toHaveBeenCalledWith('id', 'candidate-1')
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(selectMock).toHaveBeenCalledWith('id')
  })

  it('throws when update returns an error', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    })

    await expect(
      linkCandidateEnrichment({
        candidateId: 'candidate-1',
        userId: 'user-1',
        enrichmentId: 'enrichment-1',
      })
    ).rejects.toThrow('Failed to link candidate enrichment: permission denied')
  })

  it('throws when no candidate row is updated', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    })

    await expect(
      linkCandidateEnrichment({
        candidateId: 'candidate-1',
        userId: 'user-1',
        enrichmentId: 'enrichment-1',
      })
    ).rejects.toThrow('Failed to link candidate enrichment: candidate not found')
  })
})
