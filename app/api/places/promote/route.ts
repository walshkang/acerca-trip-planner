import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listItemSeedTagsFromNormalizedData } from '@/lib/lists/list-item-seed-tags'
import { normalizeTagList } from '@/lib/lists/tags'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication using session-respecting server client
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json().catch(() => ({}))
    const { candidate_id, list_id } = body as {
      candidate_id?: string
      list_id?: string | null
    }
    const tags = (body as { tags?: unknown })?.tags
    const rawBody = body as { include_automatic_tags?: unknown }
    const includeAutomaticTags =
      typeof rawBody.include_automatic_tags === 'boolean'
        ? rawBody.include_automatic_tags
        : true
    
    if (!candidate_id) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }
    
    // Call RPC function (RPC handles candidate ownership check internally)
    const { data: placeId, error } = await supabase.rpc('promote_place_candidate', {
      p_candidate_id: candidate_id,
      p_list_id: list_id ?? null,
    })
    
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to promote candidate' },
        { status: 500 }
      )
    }

    let resolvedListId: string | null =
      typeof list_id === 'string' && list_id.length ? list_id : null

    if (!resolvedListId) {
      const { data: defaultList } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle()

      resolvedListId = defaultList?.id ?? null
    }

    if (resolvedListId) {
      const hasTagsField = Object.prototype.hasOwnProperty.call(body, 'tags')
      const normalizedProvided = hasTagsField ? normalizeTagList(tags) : []
      if (hasTagsField && normalizedProvided === null) {
        return NextResponse.json(
          { error: 'tags must be a string or string[]' },
          { status: 400 }
        )
      }
      const providedTags = normalizedProvided ?? []

      let seedTags: string[] = []
      const { data: place } = await supabase
        .from('places')
        .select('enrichment_id')
        .eq('id', placeId)
        .single()

      if (includeAutomaticTags && place?.enrichment_id) {
        const { data: enrichment } = await supabase
          .from('enrichments')
          .select('normalized_data')
          .eq('id', place.enrichment_id)
          .single()

        const raw = enrichment?.normalized_data as
          | { tags?: unknown; category?: unknown }
          | null
          | undefined
        seedTags = listItemSeedTagsFromNormalizedData(raw)
      }

      const desiredTags =
        seedTags.length || providedTags.length
          ? (normalizeTagList([...seedTags, ...providedTags]) ?? [])
          : []

      if (desiredTags.length) {
        const { error: tagError } = await supabase
          .from('list_items')
          .upsert(
            {
              list_id: resolvedListId,
              place_id: placeId,
              tags: desiredTags,
            },
            { onConflict: 'list_id,place_id' }
          )

        if (tagError) {
          return NextResponse.json(
            { error: tagError.message || 'Failed to save list tags' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ place_id: placeId, list_id: resolvedListId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
