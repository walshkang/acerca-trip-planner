import { NextResponse } from 'next/server'
import { lookupNeighborhood } from '@/lib/geo/nycNeighborhoods'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'Missing lat/lng query params.' },
      { status: 400 }
    )
  }

  const result = lookupNeighborhood(lat, lng)

  return NextResponse.json({
    neighborhood: result?.name ?? null,
    borough: result?.borough ?? null,
  })
}
