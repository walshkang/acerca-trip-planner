import { NextRequest, NextResponse } from 'next/server'
import { parseIngestSocialRequest } from '@/lib/social/extraction-contract'
import { ingestSocialSource } from '@/lib/server/social/ingest'

export async function POST(request: NextRequest) {
  const ingestKey = process.env.SOCIAL_INGEST_KEY
  if (ingestKey && request.headers.get('X-Ingest-Key') !== ingestKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = parseIngestSocialRequest(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  const result = await ingestSocialSource(parsed.data)
  return NextResponse.json(result, { status: result.error ? 500 : 200 })
}
