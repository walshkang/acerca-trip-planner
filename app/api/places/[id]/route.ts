import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_ENUM_VALUES } from '@/lib/types/enums'
import type { CategoryEnum } from '@/lib/types/enums'

function isCategoryEnum(value: string): value is CategoryEnum {
  return (CATEGORY_ENUM_VALUES as readonly string[]).includes(value)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { category?: unknown }
    if (typeof body.category !== 'string') {
      return NextResponse.json(
        { error: 'category is required and must be a string' },
        { status: 400 }
      )
    }
    if (!isCategoryEnum(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORY_ENUM_VALUES.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('places')
      .update({ category: body.category })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, category, updated_at')
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: error?.message || 'Update failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ place: data })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
