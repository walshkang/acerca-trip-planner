import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateExportRequest } from '@/lib/export/contract'
import { resolveExportRows } from '@/lib/export/resolve-export-rows'
import { serializeClipboard } from '@/lib/export/serialize-clipboard'
import { serializeMarkdown } from '@/lib/export/serialize-markdown'
import { serializeCsv } from '@/lib/export/serialize-csv'
import { serializeGoogleMapsUrls } from '@/lib/export/serialize-google-maps-urls'

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

export async function POST(
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

    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateExportRequest(parsedBody)
    if ('errors' in validation) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }
    const { format, scope = 'all', categories, tags } = validation.request

    // Fetch list metadata
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, name, start_date, end_date, timezone')
      .eq('id', params.id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const rows = await resolveExportRows(supabase, params.id, scope, {
      categories,
      tags,
    })

    const listContext = {
      name: list.name,
      start_date: list.start_date,
      end_date: list.end_date,
    }

    switch (format) {
      case 'clipboard': {
        const text = serializeClipboard(rows, listContext)
        return NextResponse.json({ text, place_count: rows.length })
      }

      case 'markdown': {
        const md = serializeMarkdown(rows, listContext)
        const filename = `${slugifyName(list.name)}.md`
        return new NextResponse(md, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'csv': {
        const csv = serializeCsv(rows)
        const filename = `${slugifyName(list.name)}.csv`
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'google_maps_urls': {
        const urls = serializeGoogleMapsUrls(rows)
        return NextResponse.json({ urls, place_count: rows.length })
      }
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
