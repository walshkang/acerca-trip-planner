import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next') ?? '/auth/sign-in'
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL(next, url.origin))
}

