import type {
  ImportCommitRequest,
  ImportCommitResponse,
  ImportErrorPayload,
  ImportPreviewRequest,
  ImportPreviewResponse,
} from '@/lib/import/contract'

export class ImportApiError extends Error {
  readonly status: number
  readonly payload: ImportErrorPayload | null

  constructor(
    message: string,
    status: number,
    payload: ImportErrorPayload | null = null
  ) {
    super(message)
    this.name = 'ImportApiError'
    this.status = status
    this.payload = payload
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.payload?.code === 'unauthorized'
  }
}

async function readImportError(res: Response): Promise<ImportErrorPayload | null> {
  const json = (await res.json().catch(() => null)) as unknown
  if (!json || typeof json !== 'object') return null
  const o = json as Record<string, unknown>
  if (typeof o.code !== 'string' || typeof o.message !== 'string') return null
  return json as ImportErrorPayload
}

export async function importPreview(
  listId: string,
  body: ImportPreviewRequest
): Promise<ImportPreviewResponse> {
  const res = await fetch(`/api/lists/${listId}/import/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const payload = await readImportError(res)
    throw new ImportApiError(
      payload?.message ?? `Import preview failed (${res.status})`,
      res.status,
      payload
    )
  }

  const data = (await res.json().catch(() => null)) as ImportPreviewResponse | null
  if (!data || !Array.isArray(data.rows) || typeof data.preview_id !== 'string') {
    throw new ImportApiError('Invalid preview response', res.status, null)
  }
  return data
}

export async function importCommit(
  listId: string,
  body: ImportCommitRequest
): Promise<ImportCommitResponse> {
  const res = await fetch(`/api/lists/${listId}/import/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const payload = await readImportError(res)
    throw new ImportApiError(
      payload?.message ?? `Import commit failed (${res.status})`,
      res.status,
      payload
    )
  }

  const data = (await res.json().catch(() => null)) as ImportCommitResponse | null
  if (
    !data ||
    !Array.isArray(data.committed) ||
    !Array.isArray(data.errors)
  ) {
    throw new ImportApiError('Invalid commit response', res.status, null)
  }
  return data
}
