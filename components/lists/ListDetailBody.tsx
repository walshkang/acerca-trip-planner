'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { normalizeTagList } from '@/lib/lists/tags'

export type ListSummary = {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  start_date: string | null
  end_date: string | null
  timezone: string | null
}

export type PlaceSummary = {
  id: string
  name: string
  category: string
  address: string | null
  created_at: string
  user_notes: string | null
  user_tags: string[] | null
}

export type ListItemRow = {
  id: string
  created_at: string
  scheduled_date: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  scheduled_order: number | null
  completed_at: string | null
  tags: string[] | null
  place: PlaceSummary | null
}

type Props = {
  list: ListSummary | null
  items: ListItemRow[]
  loading?: boolean
  error?: string | null
  onPlaceSelect?: (placeId: string) => void
  emptyLabel?: string
  availableTags?: string[]
  activeTagFilters?: string[]
  onTagFilterToggle?: (tag: string) => void
  onClearTagFilters?: () => void
  onTagsUpdate?: (itemId: string, tags: string[]) => Promise<string[]>
  tone?: 'light' | 'dark'
}

function formatDateRange(list: ListSummary) {
  if (!list.start_date && !list.end_date) return null
  const start = list.start_date ?? '—'
  const end = list.end_date ?? '—'
  return `${start} → ${end}`
}

type TagEditorProps = {
  itemId: string
  tags: string[] | null
  onTagsUpdate?: (itemId: string, tags: string[]) => Promise<string[]>
  tone?: 'light' | 'dark'
}

function TagEditor({ itemId, tags, onTagsUpdate, tone = 'light' }: TagEditorProps) {
  const [tagInput, setTagInput] = useState('')
  const [chipTags, setChipTags] = useState(tags ?? [])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const isDark = tone === 'dark'
  const chipClass = isDark
    ? 'border-white/10 text-slate-200'
    : 'border-gray-200 text-gray-600'
  const chipButtonClass = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : 'text-gray-400 hover:text-gray-600'
  const mutedText = isDark ? 'text-slate-300' : 'text-gray-500'
  const inputClass = isDark
    ? 'glass-input flex-1 text-xs'
    : 'flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700'
  const buttonClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60'
    : 'rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 disabled:opacity-60'
  const savedClass = isDark ? 'text-emerald-300' : 'text-green-700'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'

  useEffect(() => {
    setChipTags(tags ?? [])
    setTagInput('')
  }, [tags])

  if (!onTagsUpdate) return null

  async function commitTags(nextTags: string[]) {
    setStatus('saving')
    setError(null)
    try {
      const updated = await onTagsUpdate(itemId, nextTags)
      setChipTags(updated)
      setTagInput('')
      setStatus('saved')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  function normalizeMergedTags(tagsToMerge: string[]) {
    return normalizeTagList(tagsToMerge) ?? []
  }

  async function handleAdd(event?: FormEvent) {
    event?.preventDefault()
    const nextAdd = normalizeTagList(tagInput)
    if (!nextAdd || !nextAdd.length) return
    const merged = normalizeMergedTags([...chipTags, ...nextAdd])
    await commitTags(merged)
  }

  async function handleRemove(tag: string) {
    const next = chipTags.filter((t) => t !== tag)
    await commitTags(next)
  }

  async function handleClear() {
    await commitTags([])
  }

  return (
    <form onSubmit={handleAdd} className="mt-2 space-y-2">
      {chipTags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {chipTags.map((tag) => (
            <span
              key={`${itemId}-${tag}`}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className={`text-[10px] ${chipButtonClass}`}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className={`text-[10px] ${mutedText} underline`}
          >
            × Clear
          </button>
        </div>
      ) : (
        <p className={`text-[11px] ${mutedText}`}>No tags yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={inputClass}
          placeholder="Add tags (comma-separated)"
          value={tagInput}
          onChange={(event) => {
            setTagInput(event.target.value)
            if (status !== 'idle') {
              setStatus('idle')
              setError(null)
            }
          }}
          disabled={status === 'saving'}
        />
        <button
          type="submit"
          className={buttonClass}
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Add'}
        </button>
      </div>
      {status === 'saved' ? (
        <p className={`text-[11px] ${savedClass}`}>Saved.</p>
      ) : null}
      {status === 'error' ? (
        <p className={`text-[11px] ${errorClass}`}>{error}</p>
      ) : null}
    </form>
  )
}

export default function ListDetailBody({
  list,
  items,
  loading = false,
  error = null,
  onPlaceSelect,
  emptyLabel = 'No places in this list yet.',
  availableTags = [],
  activeTagFilters = [],
  onTagFilterToggle,
  onClearTagFilters,
  onTagsUpdate,
  tone = 'light',
}: Props) {
  const rangeLabel = useMemo(
    () => (list ? formatDateRange(list) : null),
    [list]
  )
  const isDark = tone === 'dark'
  const panelClass = isDark ? 'border-white/10 bg-slate-900/40' : 'border-gray-200 bg-white'
  const titleClass = isDark ? 'text-slate-100' : 'text-gray-900'
  const bodyText = isDark ? 'text-slate-300' : 'text-gray-600'
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500'
  const chipClass = isDark ? 'border-white/10 text-slate-300' : 'border-gray-200 text-gray-500'
  const tagInactiveClass = isDark
    ? 'border-white/10 text-slate-200 hover:border-white/30'
    : 'border-gray-200 text-gray-600'
  const tagActiveClass = isDark
    ? 'border-slate-100 bg-slate-100 text-slate-900'
    : 'border-gray-900 bg-gray-900 text-white'
  const rowBorder = isDark ? 'border-white/10' : 'border-gray-100'
  const errorText = isDark ? 'text-red-300' : 'text-red-600'

  if (loading && !list) {
    return <p className={`text-sm ${mutedText}`}>Loading list…</p>
  }

  if (error && !list) {
    return <p className={`text-sm ${errorText}`}>{error}</p>
  }

  return (
    <section className="space-y-6">
      {list ? (
        <div className={`rounded-lg border p-4 ${panelClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-semibold ${titleClass}`}>
              <a
                className="hover:underline"
                href={`/lists/${list.id}`}
              >
                {list.name}
              </a>
            </h2>
            {list.is_default ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                Default
              </span>
            ) : null}
          </div>
          {list.description ? (
            <p className={`mt-1 text-sm ${bodyText}`}>{list.description}</p>
          ) : null}
          {rangeLabel ? (
            <p className={`mt-2 text-xs ${mutedText}`}>Dates: {rangeLabel}</p>
          ) : null}
          {list.timezone ? (
            <p className={`mt-1 text-xs ${mutedText}`}>
              Timezone: {list.timezone}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`rounded-lg border p-4 space-y-3 ${panelClass}`}>
        <h3 className={`text-sm font-semibold ${titleClass}`}>Places</h3>
        {loading ? <p className={`text-xs ${mutedText}`}>Loading…</p> : null}
        {!loading && !items.length ? (
          <p className={`text-xs ${mutedText}`}>{emptyLabel}</p>
        ) : null}

        {availableTags.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-semibold ${bodyText}`}>
                Filter tags
              </p>
              {activeTagFilters.length && onClearTagFilters ? (
                <button
                  type="button"
                  className={`text-[11px] ${mutedText} underline`}
                  onClick={() => onClearTagFilters?.()}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const active = activeTagFilters.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagFilterToggle?.(tag)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      active ? tagActiveClass : tagInactiveClass
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const place = item.place
            if (!place) return null
            return (
              <div
                key={item.id}
                className={`rounded-md border px-3 py-2 ${rowBorder}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {onPlaceSelect ? (
                    <button
                      type="button"
                      className={`text-sm font-medium ${titleClass} hover:underline`}
                      onClick={() => onPlaceSelect(place.id)}
                    >
                      {place.name}
                    </button>
                  ) : (
                    <span className={`text-sm font-medium ${titleClass}`}>
                      {place.name}
                    </span>
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                    {place.category}
                  </span>
                  {item.completed_at ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                      Done
                    </span>
                  ) : null}
                </div>
                {place.address ? (
                  <p className={`mt-1 text-xs ${mutedText}`}>{place.address}</p>
                ) : null}
                <TagEditor
                  itemId={item.id}
                  tags={item.tags ?? []}
                  onTagsUpdate={onTagsUpdate}
                  tone={tone}
                />
              </div>
            )
          })}
        </div>

        {error ? <p className={`text-xs ${errorText}`}>{error}</p> : null}
      </div>
    </section>
  )
}
