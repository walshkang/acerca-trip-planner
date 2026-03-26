/**
 * Client-only: POST list CSV export and trigger a browser download.
 */

export type ListCsvExportResult =
  | { ok: true }
  | { ok: false; kind: 'unauthorized' }
  | { ok: false; kind: 'bad_request'; message: string }
  | { ok: false; kind: 'other'; message: string }

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(header)
  if (star?.[1]) return decodeURIComponent(star[1])
  const plain = /filename=([^;\s]+)/i.exec(header)
  if (plain?.[1]) return plain[1].replace(/^["']|["']$/g, '')
  return null
}

async function errorMessageFromResponse(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const o = data as Record<string, unknown>
      if (typeof o.error === 'string' && o.error.trim()) return o.error
      if (Array.isArray(o.errors)) {
        const parts = o.errors.map((e) => {
          if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
            return (e as { message: string }).message
          }
          return String(e)
        })
        if (parts.length) return parts.join('; ')
      }
    }
  } catch {
    /* ignore */
  }
  return 'Export failed.'
}

/**
 * Request CSV for a list and download it. Must run in the browser.
 */
export async function downloadListCsv(listId: string): Promise<ListCsvExportResult> {
  const res = await fetch(`/api/lists/${listId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'csv' }),
  })

  if (res.status === 401) {
    return { ok: false, kind: 'unauthorized' }
  }

  if (res.ok) {
    const csvText = await res.text()
    const filename =
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ?? 'list-export.csv'
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return { ok: true }
  }

  const message = await errorMessageFromResponse(res)
  if (res.status === 400) {
    return { ok: false, kind: 'bad_request', message }
  }
  return { ok: false, kind: 'other', message }
}
