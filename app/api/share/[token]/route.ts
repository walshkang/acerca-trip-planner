import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyShareToken } from '@/lib/export/share-token'
import { resolveExportRows } from '@/lib/export/resolve-export-rows'
import { serializeClipboard } from '@/lib/export/serialize-clipboard'
import { serializeMarkdown } from '@/lib/export/serialize-markdown'
import { serializeCsv } from '@/lib/export/serialize-csv'
import { serializeGoogleMapsUrls } from '@/lib/export/serialize-google-maps-urls'
import type { ExportFormat } from '@/lib/export/contract'
import { EXPORT_FORMAT_VALUES } from '@/lib/export/contract'

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const parsed = verifyShareToken(params.token)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 403 })
    }
    const { listId } = parsed

    // Use admin/service client to fetch the list without auth restrictions,
    // but still verify the list exists
    const supabase = await createClient()

    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, name, start_date, end_date, timezone')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const formatParam = request.nextUrl.searchParams.get('format')
    const format: ExportFormat =
      formatParam && (EXPORT_FORMAT_VALUES as string[]).includes(formatParam)
        ? (formatParam as ExportFormat)
        : 'markdown'

    const rows = await resolveExportRows(supabase, listId, 'all')

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
