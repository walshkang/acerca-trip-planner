import { NextRequest, NextResponse } from 'next/server'
import { fetchContent } from '@/lib/server/social/fetch-content'

export async function POST(request: NextRequest) {
  const ingestKey = process.env.SOCIAL_INGEST_KEY
  if (ingestKey && request.headers.get('X-Ingest-Key') !== ingestKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const result = await fetchContent(url)

  if ('error' in result) {
    const status = ['invalid_url', 'platform_not_supported'].includes(result.error) ? 400 : 502
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
