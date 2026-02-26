import { describe, expect, it } from 'vitest'
import {
  parseRoutingPreviewRequest,
  type RoutingPreviewErrorPayload,
} from '@/lib/routing/contract'

describe('parseRoutingPreviewRequest', () => {
  it('accepts valid date and defaults mode to scheduled', () => {
    const parsed = parseRoutingPreviewRequest({
      date: '2026-03-01',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.canonical).toEqual({
      date: '2026-03-01',
      mode: 'scheduled',
    })
  })

  it('rejects non-object payloads', () => {
    const parsed = parseRoutingPreviewRequest(null)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('invalid_routing_payload')
    expect(parsed.fieldErrors.payload).toEqual([
      'Routing preview payload must be a JSON object',
    ])
  })

  it('rejects missing date', () => {
    const parsed = parseRoutingPreviewRequest({})
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.date).toEqual([
      'date is required and must be YYYY-MM-DD',
    ])
  })

  it('rejects invalid date format', () => {
    const parsed = parseRoutingPreviewRequest({
      date: '2026-02-31',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.date).toEqual(['date must be YYYY-MM-DD'])
  })

  it('rejects unsupported mode', () => {
    const parsed = parseRoutingPreviewRequest({
      date: '2026-03-01',
      mode: 'optimize',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.mode).toEqual(['mode must be "scheduled"'])
  })

  it('rejects unknown keys', () => {
    const parsed = parseRoutingPreviewRequest({
      date: '2026-03-01',
      foo: 'bar',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.fieldErrors.payload).toEqual(['Unknown field: foo'])
  })

  it('supports provider bad gateway error code in payload contract', () => {
    const payload: RoutingPreviewErrorPayload = {
      code: 'routing_provider_bad_gateway',
      message: 'Upstream provider returned invalid leg metrics.',
      lastValidCanonicalRequest: { date: '2026-03-01', mode: 'scheduled' },
    }

    expect(payload.code).toBe('routing_provider_bad_gateway')
  })
})
