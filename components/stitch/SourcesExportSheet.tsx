'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExportItem, ImportFromSourcesResponse } from '@/lib/social/sources-export-payload'
import { useSourcesStore } from '@/lib/state/useSourcesStore'

type Props = {
  open: boolean
  onClose: () => void
  items: ExportItem[]
}

type ListOption = { id: string; name: string }

function slotEqual(existing: number | null, requested: number | undefined): boolean {
  const a = existing === null || existing === undefined ? null : existing
  const b = requested === undefined ? null : requested
  return a === b
}

function duplicateRowLabel(
  placeName: string,
  existing_day_index: number | null,
  requested_day_index: number | undefined
): string {
  const dayConflict = !slotEqual(existing_day_index, requested_day_index)
  if (dayConflict && existing_day_index != null && Number.isFinite(existing_day_index)) {
    return `${placeName} — already on Day ${existing_day_index}`
  }
  return `${placeName} — already added`
}

export default function SourcesExportSheet({ open, onClose, items }: Props) {
  const resetSources = useSourcesStore((s) => s.reset)

  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [newListName, setNewListName] = useState('')
  const [targetListId, setTargetListId] = useState('')
  const [listOptions, setListOptions] = useState<ListOption[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [dupesPayload, setDupesPayload] = useState<ImportFromSourcesResponse | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode('new')
    setNewListName('')
    setTargetListId('')
    setSubmitError(null)
    setDupesPayload(null)
    setListsError(null)
    setSuccessToast(null)
  }, [open])

  useEffect(() => {
    if (!successToast) return
    const t = window.setTimeout(() => setSuccessToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [successToast])

  useEffect(() => {
    if (!open || mode !== 'existing') return
    let cancelled = false
    setListsLoading(true)
    setListsError(null)
    void (async () => {
      try {
        const res = await fetch('/api/lists', { credentials: 'same-origin' })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          if (!cancelled) {
            setListsError(body?.error ?? 'Could not load lists')
            setListOptions([])
          }
          return
        }
        const body = (await res.json()) as { lists?: Array<{ id: string; name: string }> }
        const rows = body.lists ?? []
        if (!cancelled) {
          const options = rows.map((l) => ({ id: l.id, name: l.name }))
          setListOptions(options)
          setTargetListId((prev) => {
            if (prev && options.some((o) => o.id === prev)) return prev
            return options[0]?.id ?? ''
          })
        }
      } catch {
        if (!cancelled) {
          setListsError('Could not load lists')
          setListOptions([])
        }
      } finally {
        if (!cancelled) setListsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, mode])

  const nPlaces = items.length
  const nWithDay = useMemo(
    () => items.filter((i) => i.day_index !== undefined && i.day_index !== null).length,
    [items]
  )

  const runExport = useCallback(async () => {
    if (dupesPayload) {
      onClose()
      return
    }
    setSubmitError(null)
    if (mode === 'new' && !newListName.trim()) {
      setSubmitError('Enter a list name.')
      return
    }
    if (mode === 'existing' && !targetListId) {
      setSubmitError('Choose a list.')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        mode,
        items: items.map((it) => {
          const row: Record<string, unknown> = { place_id: it.place_id }
          if (it.day_index !== undefined) row.day_index = it.day_index
          if (it.tags?.length) row.tags = it.tags
          return row
        }),
      }
      if (mode === 'new') body.new_list_name = newListName.trim()
      if (mode === 'existing') body.target_list_id = targetListId

      const res = await fetch('/api/lists/import-from-sources', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => null)) as
        | ImportFromSourcesResponse
        | { error?: string }
        | null

      if (!res.ok) {
        setSubmitError(
          typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Export failed.'
        )
        return
      }

      const ok = data as ImportFromSourcesResponse
      if (ok.duplicate_items?.length) {
        setDupesPayload(ok)
        return
      }

      setSuccessToast(`Exported to ${ok.list_name}`)
      onClose()
      resetSources()
    } catch {
      setSubmitError('Export failed.')
    } finally {
      setSubmitting(false)
    }
  }, [dupesPayload, items, mode, newListName, onClose, resetSources, targetListId])

  const handlePrimary = () => {
    void runExport()
  }

  if (!open && !successToast) {
    return null
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close export sheet"
            onClick={onClose}
          />
          <div
            data-testid="sources-export-sheet"
            className="absolute inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] flex-col overflow-y-auto rounded-t-[4px] border-t border-paper-tertiary-fixed bg-paper-surface-warm"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex shrink-0 flex-col items-center border-b border-paper-tertiary-fixed/60 py-2">
              <span className="mb-1 h-1 w-10 rounded-full bg-paper-tertiary-fixed" aria-hidden />
            </div>

            <div className="min-h-0 flex-1 space-y-4 px-4 pb-4 pt-1">
              <p className="font-headline text-sm font-extrabold text-paper-on-surface">Export to</p>

              <div className="space-y-2" role="radiogroup" aria-label="Export destination">
                <div
                  role="radio"
                  aria-checked={mode === 'new'}
                  tabIndex={0}
                  onClick={() => setMode('new')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setMode('new')
                    }
                  }}
                  className={`w-full cursor-pointer rounded-[4px] border px-3 py-2.5 text-left transition-colors ${
                    mode === 'new'
                      ? 'border-paper-primary bg-paper-surface-container-low'
                      : 'border-paper-tertiary-fixed'
                  }`}
                >
                  <span className="text-sm font-medium text-paper-on-surface">Create new list</span>
                  {mode === 'new' ? (
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Name your list…"
                      className="mt-2 w-full border-0 border-b border-paper-tertiary-fixed bg-transparent font-headline text-base text-paper-on-surface placeholder:text-paper-on-surface-variant focus:border-paper-primary focus:outline-none focus:ring-0"
                    />
                  ) : null}
                </div>

                <div
                  role="radio"
                  aria-checked={mode === 'existing'}
                  tabIndex={0}
                  onClick={() => setMode('existing')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setMode('existing')
                    }
                  }}
                  className={`w-full cursor-pointer rounded-[4px] border px-3 py-2.5 text-left transition-colors ${
                    mode === 'existing'
                      ? 'border-paper-primary bg-paper-surface-container-low'
                      : 'border-paper-tertiary-fixed'
                  }`}
                >
                  <span className="text-sm font-medium text-paper-on-surface">Add to existing list</span>
                  {mode === 'existing' ? (
                    <div
                      className="mt-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {listsLoading ? (
                        <p className="text-xs text-paper-on-surface-variant">Loading lists…</p>
                      ) : listsError ? (
                        <p className="text-xs text-red-600 dark:text-red-400">{listsError}</p>
                      ) : (
                        <select
                          value={targetListId}
                          onChange={(e) => setTargetListId(e.target.value)}
                          className="w-full rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-2 py-2 text-sm text-paper-on-surface"
                        >
                          {listOptions.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="text-xs text-paper-on-surface-variant">
                {nPlaces} place{nPlaces !== 1 ? 's' : ''} · {nWithDay} with day assignments
              </p>

              {dupesPayload && dupesPayload.duplicate_items.length > 0 ? (
                <div
                  className="space-y-2 rounded-[4px] border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40"
                  role="region"
                  aria-label="Skipped duplicates"
                >
                  <p className="text-sm text-amber-950 dark:text-amber-100">
                    {dupesPayload.duplicate_items.length} place
                    {dupesPayload.duplicate_items.length !== 1 ? 's' : ''} already in{' '}
                    {dupesPayload.list_name} — skipped
                  </p>
                  <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-100">
                    {dupesPayload.duplicate_items.map((d) => (
                      <li key={d.place_id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span>{duplicateRowLabel(d.place_name, d.existing_day_index, d.requested_day_index)}</span>
                        <span className="text-[10px] uppercase tracking-wide text-amber-800/70 dark:text-amber-200/70">
                          keep original
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {submitError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 space-y-2 border-t border-paper-tertiary-fixed bg-paper-surface-warm px-4 pb-4 pt-3">
              <button
                type="button"
                className="paper-button-primary w-full"
                disabled={
                  submitting ||
                  (!dupesPayload && mode === 'existing' && listsLoading && !listOptions.length)
                }
                onClick={handlePrimary}
              >
                {submitting
                  ? 'Exporting…'
                  : dupesPayload
                    ? 'Done'
                    : `Export ${nPlaces} place${nPlaces !== 1 ? 's' : ''}`}
              </button>
              <button
                type="button"
                className="w-full text-center text-xs text-paper-on-surface-variant underline underline-offset-2"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[110] max-w-[min(360px,92vw)] -translate-x-1/2 rounded-[4px] border border-paper-tertiary-fixed bg-paper-surface-container px-4 py-2.5 text-sm text-paper-on-surface shadow-lg"
          style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {successToast}
        </div>
      ) : null}
    </>
  )
}
