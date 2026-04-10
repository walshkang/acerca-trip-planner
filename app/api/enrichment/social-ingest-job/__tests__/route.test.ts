import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { GET } from '@/app/api/enrichment/social-ingest-job/[id]/route'

const SAMPLE_JOB_ID = 'e82adca1-2db6-4ffb-8c8d-acb344b05932'

describe('/api/enrichment/social-ingest-job/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const mock = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    }
    createClientMock.mockResolvedValue(mock)

    const response = await GET(new Request(`http://localhost/api/enrichment/social-ingest-job/${SAMPLE_JOB_ID}`), {
      params: { id: SAMPLE_JOB_ID },
    } as any)

    expect(response.status).toBe(401)
  })

  it('returns job row with telemetry fields', async () => {
    const jobRow = {
      id: SAMPLE_JOB_ID,
      status: 'succeeded',
      progress_message: 'Done - 2 places added',
      error_message: null,
      places_resolved: 2,
      places_failed: 0,
      failures: null,
      fetch_ms: 120,
      extract_ms: 450,
      places_ms: 230,
      model_id: 'gemini-1.5-flash',
      raw_llm_output: 'raw text here',
      user_id: 'user-1',
    }

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: jobRow, error: null })
    const eqMock2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock1 })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })

    const mock = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: fromMock,
    }
    createClientMock.mockResolvedValue(mock)

    const response = await GET(new Request(`http://localhost/api/enrichment/social-ingest-job/${SAMPLE_JOB_ID}`), {
      params: { id: SAMPLE_JOB_ID },
    } as any)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(jobRow)
  })
})
