'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import OverlayPanel from '@/components/ui/OverlayPanel'
import ImportPreviewTable from '@/components/import/ImportPreviewTable'
import type { ConfirmedRow, ImportPreviewResponse, PreviewRow } from '@/lib/import/contract'
import { ImportApiError, importCommit, importPreview } from '@/lib/import/client'
import { parseImportCsv, parseImportJson } from '@/lib/import/parse-import-input'

type Props = {
  listId: string
  open: boolean
  onClose: () => void
  tripStartDate?: string | null
  tripEndDate?: string | null
  onSuccess?: () => void
}

function schedulingFromInput(
  input: PreviewRow['input']
): Pick<ConfirmedRow, 'scheduled_date' | 'scheduled_slot'> {
  const d = input.scheduled_date
  const s = input.scheduled_slot
  if (d && s) {
    return { scheduled_date: d, scheduled_slot: s }
  }
  return {}
}

function buildConfirmedRow(row: PreviewRow, google_place_id: string): ConfirmedRow {
  const base: ConfirmedRow = {
    row_index: row.row_index,
    google_place_id,
    ...schedulingFromInput(row.input),
  }
  if (row.input.item_tags?.length) {
    base.item_tags = row.input.item_tags
  }
  return base
}

export default function ImportWizard({
  listId,
  open,
  onClose,
  tripStartDate,
  tripEndDate,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [fileText, setFileText] = useState<string | null>(null)
  const [fileAsJson, setFileAsJson] = useState(false)

  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input')
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [ambiguousPicks, setAmbiguousPicks] = useState<Record<number, string>>({})

  const [parseError, setParseError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCommit, setLoadingCommit] = useState(false)

  const [doneStats, setDoneStats] = useState<{
    created: number
    updated: number
    errors: number
  } | null>(null)

  const resetTransient = useCallback(() => {
    setStep('input')
    setPreview(null)
    setSelectedIndices(new Set())
    setAmbiguousPicks({})
    setParseError(null)
    setApiError(null)
    setDoneStats(null)
    setPasteText('')
    setFileLabel(null)
    setFileText(null)
    setFileAsJson(false)
  }, [])

  useEffect(() => {
    if (!open) {
      resetTransient()
    }
  }, [open, resetTransient])

  const handleApiFailure = useCallback(
    (e: unknown) => {
      if (e instanceof ImportApiError && e.isUnauthorized) {
        const next =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/lists'
        router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`)
        return
      }
      const msg =
        e instanceof ImportApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Request failed'
      setApiError(msg)
    },
    [router]
  )

  const readFileAsText = useCallback((file: File) => {
    setFileLabel(file.name)
    const asJson = /\.json$/i.test(file.name)
    setFileAsJson(asJson)
    const reader = new FileReader()
    reader.onload = () => {
      const text =
        typeof reader.result === 'string' ? reader.result : ''
      setFileText(text)
    }
    reader.onerror = () => {
      setFileText(null)
      setParseError('Could not read file.')
    }
    reader.readAsText(file)
  }, [])

  const runPreview = useCallback(async () => {
    setParseError(null)
    setApiError(null)

    const raw = inputMode === 'paste' ? pasteText : fileText ?? ''
    const t = raw.trim()
    if (!t) {
      setParseError('Add CSV/JSON content or choose a file.')
      return
    }

    let parsed
    if (inputMode === 'file') {
      if (fileAsJson || t[0] === '[' || t[0] === '{') {
        parsed = parseImportJson(t)
      } else {
        parsed = parseImportCsv(t)
      }
    } else if (t[0] === '[' || t[0] === '{') {
      parsed = parseImportJson(t)
    } else {
      parsed = parseImportCsv(t)
    }

    if (!parsed.ok) {
      setParseError(parsed.message)
      return
    }

    setLoadingPreview(true)
    try {
      const body = {
        rows: parsed.rows,
        ...(tripStartDate ? { trip_start_date: tripStartDate } : {}),
        ...(tripEndDate ? { trip_end_date: tripEndDate } : {}),
      }
      const res = await importPreview(listId, body)
      setPreview(res)
      const sel = new Set<number>()
      for (const r of res.rows) {
        if (r.status === 'ok') sel.add(r.row_index)
      }
      setSelectedIndices(sel)
      setAmbiguousPicks({})
      setStep('preview')
    } catch (e: unknown) {
      handleApiFailure(e)
    } finally {
      setLoadingPreview(false)
    }
  }, [
    inputMode,
    pasteText,
    fileText,
    fileAsJson,
    listId,
    tripStartDate,
    tripEndDate,
    handleApiFailure,
  ])

  const onToggleSelected = useCallback((rowIndex: number, next: boolean) => {
    setSelectedIndices((prev) => {
      const n = new Set(prev)
      if (next) n.add(rowIndex)
      else n.delete(rowIndex)
      return n
    })
  }, [])

  const onAmbiguousPick = useCallback((rowIndex: number, googlePlaceId: string) => {
    setAmbiguousPicks((prev) => ({ ...prev, [rowIndex]: googlePlaceId }))
    setSelectedIndices((prev) => new Set(prev).add(rowIndex))
  }, [])

  const runCommit = useCallback(async () => {
    if (!preview) return
    setApiError(null)

    const confirmed: ConfirmedRow[] = []
    for (const idx of selectedIndices) {
      const row = preview.rows.find((r) => r.row_index === idx)
      if (!row) continue

      if (row.status === 'ok' && row.resolved) {
        confirmed.push(buildConfirmedRow(row, row.resolved.google_place_id))
        continue
      }

      if (row.status === 'ambiguous') {
        const pick = ambiguousPicks[idx]
        if (pick) {
          confirmed.push(buildConfirmedRow(row, pick))
        }
      }
    }

    if (confirmed.length === 0) {
      setApiError('Select at least one resolved row to import.')
      return
    }

    setLoadingCommit(true)
    try {
      const res = await importCommit(listId, {
        preview_id: preview.preview_id,
        confirmed_rows: confirmed,
      })
      const created = res.committed.filter((c) => c.status === 'created').length
      const updated = res.committed.filter((c) => c.status === 'updated').length
      setDoneStats({
        created,
        updated,
        errors: res.errors.length,
      })
      setStep('done')
      onSuccess?.()
    } catch (e: unknown) {
      handleApiFailure(e)
    } finally {
      setLoadingCommit(false)
    }
  }, [preview, selectedIndices, ambiguousPicks, listId, onSuccess, handleApiFailure])

  const goBackToInput = useCallback(() => {
    setStep('input')
    setPreview(null)
    setSelectedIndices(new Set())
    setAmbiguousPicks({})
    setApiError(null)
  }, [])

  const finishDone = useCallback(() => {
    resetTransient()
    onClose()
  }, [onClose, resetTransient])

  if (!open) return null

  const subtitle =
    step === 'input'
      ? 'Upload or paste CSV/JSON, then preview before adding to the list.'
      : step === 'preview'
        ? 'Review resolved places and warnings, then confirm.'
        : 'Import finished.'

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-slate-900/25"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center md:p-4">
        <div className="pointer-events-auto flex max-h-[min(88dvh,100%)] w-full flex-col md:max-h-[90vh] md:w-[min(960px,96vw)]">
          <OverlayPanel
            title="Import places"
            subtitle={subtitle}
            onClose={onClose}
            tone="light"
            className="flex min-h-0 flex-1 flex-col rounded-t-xl md:rounded-xl"
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            {step === 'input' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      inputMode === 'paste'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-200 bg-white text-gray-700'
                    }`}
                    onClick={() => setInputMode('paste')}
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      inputMode === 'file'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-200 bg-white text-gray-700'
                    }`}
                    onClick={() => setInputMode('file')}
                  >
                    File
                  </button>
                </div>

                {inputMode === 'paste' ? (
                  <textarea
                    className="min-h-[160px] w-full rounded-md border border-gray-200 p-2 font-mono text-xs text-gray-900"
                    placeholder="Paste CSV or JSON rows…"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <div className="space-y-2">
                    <label
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-xs text-gray-600 hover:bg-gray-100"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const f = e.dataTransfer.files?.[0]
                        if (f) readFileAsText(f)
                      }}
                    >
                      <input
                        type="file"
                        accept=".csv,.json,text/csv,application/json"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) readFileAsText(f)
                        }}
                      />
                      Drop a .csv or .json file here, or click to choose
                    </label>
                    {fileLabel ? (
                      <p className="text-xs text-gray-600">
                        Selected: <span className="font-medium">{fileLabel}</span>
                      </p>
                    ) : null}
                  </div>
                )}

                {parseError ? (
                  <p className="text-xs text-red-600">{parseError}</p>
                ) : null}
                {apiError ? (
                  <p className="text-xs text-red-600">{apiError}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    onClick={() => void runPreview()}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? 'Previewing…' : 'Preview'}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'preview' && preview ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ImportPreviewTable
                    rows={preview.rows}
                    tripSummary={preview.trip_summary}
                    selectedIndices={selectedIndices}
                    onToggleSelected={onToggleSelected}
                    ambiguousPicks={ambiguousPicks}
                    onAmbiguousPick={onAmbiguousPick}
                  />
                </div>
                {apiError ? (
                  <p className="text-xs text-red-600">{apiError}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800"
                    onClick={goBackToInput}
                    disabled={loadingCommit}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    onClick={() => void runCommit()}
                    disabled={loadingCommit}
                  >
                    {loadingCommit ? 'Importing…' : 'Confirm import'}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 'done' && doneStats ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-800">
                  {doneStats.created} places added, {doneStats.updated} updated
                  {doneStats.errors > 0
                    ? `, ${doneStats.errors} errors`
                    : ''}
                  .
                </p>
                <button
                  type="button"
                  className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white"
                  onClick={finishDone}
                >
                  Done
                </button>
              </div>
            ) : null}
          </OverlayPanel>
        </div>
      </div>
    </div>
  )
}
