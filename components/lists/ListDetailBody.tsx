'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { CategoryEnum } from '@/lib/types/enums'
import { normalizeTagList } from '@/lib/lists/tags'
import { PLACE_FOCUS_GLOW } from '@/lib/ui/glow'

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
  category: CategoryEnum
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
  availableTypes?: CategoryEnum[]
  activeTypeFilters?: CategoryEnum[]
  onTypeFilterToggle?: (type: CategoryEnum) => void
  onClearTypeFilters?: () => void
  availableTags?: string[]
  activeTagFilters?: string[]
  onTagFilterToggle?: (tag: string) => void
  onClearTagFilters?: () => void
  onTagsUpdate?: (itemId: string, tags: string[]) => Promise<string[]>
  focusedPlaceId?: string | null
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
  availableTypes = [],
  activeTypeFilters = [],
  onTypeFilterToggle,
  onClearTypeFilters,
  availableTags = [],
  activeTagFilters = [],
  onTagFilterToggle,
  onClearTagFilters,
  onTagsUpdate,
  focusedPlaceId = null,
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
  const typeInactiveClass = isDark
    ? 'border-white/20 text-slate-200 hover:border-white/40'
    : 'border-gray-300 text-gray-700'
  const typeActiveClass = isDark
    ? 'border-slate-100 bg-slate-100 text-slate-900'
    : 'border-gray-900 bg-gray-900 text-white'
  const tagInactiveClass = isDark
    ? 'border-white/10 text-slate-200 hover:border-white/30'
    : 'border-gray-200 text-gray-600'
  const tagActiveClass = isDark
    ? 'border-slate-100 bg-slate-100 text-slate-900'
    : 'border-gray-900 bg-gray-900 text-white'
  const rowBorder = isDark ? 'border-white/10' : 'border-gray-100'
  const errorText = isDark ? 'text-red-300' : 'text-red-600'
  const showFilters =
    availableTypes.length > 0 ||
    availableTags.length > 0 ||
    activeTypeFilters.length > 0 ||
    activeTagFilters.length > 0
  const isTypeFiltering = activeTypeFilters.length > 0
  const focusedRowClass = isDark
    ? `border-white/60 bg-white/5 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`
    : `border-slate-200/80 bg-gray-50 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`

  useEffect(() => {
    if (!focusedPlaceId) return
    const node = document.querySelector<HTMLElement>(
      `[data-place-id="${focusedPlaceId}"]`
    )
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusedPlaceId, items.length])

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

        {showFilters ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[11px] font-semibold ${bodyText}`}>
                    Place type
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>
                    A fixed category that sets this place's map icon.
                  </p>
                </div>
                {activeTypeFilters.length && onClearTypeFilters ? (
                  <button
                    type="button"
                    className={`text-[11px] ${mutedText} underline`}
                    onClick={() => onClearTypeFilters?.()}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {availableTypes.length ? (
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((type) => {
                    const active = activeTypeFilters.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onTypeFilterToggle?.(type)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                          active ? typeActiveClass : typeInactiveClass
                        } ${
                          isTypeFiltering && !active ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        <img
                          src={getCategoryIcon(type)}
                          alt=""
                          aria-hidden="true"
                          className="h-3 w-3"
                        />
                        <span>{type}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className={`text-[11px] ${mutedText}`}>
                  No place types yet.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[11px] font-semibold ${bodyText}`}>
                    Tags
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>
                    Your labels to organize places any way you like.
                  </p>
                </div>
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
              {availableTags.length ? (
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
              ) : (
                <p className={`text-[11px] ${mutedText}`}>No tags yet.</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const place = item.place
            if (!place) return null
            const isFocused = focusedPlaceId === place.id
            return (
              <div
                key={item.id}
                data-place-id={place.id}
                className={`rounded-md border px-3 py-2 ${rowBorder} ${
                  isFocused ? focusedRowClass : ''
                }`}
              >
                {onPlaceSelect ? (
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-2 text-left"
                    onClick={() => onPlaceSelect(place.id)}
                  >
                    <span className={`text-sm font-medium ${titleClass} hover:underline`}>
                      {place.name}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                      {place.category}
                    </span>
                    {item.completed_at ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                        Done
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${titleClass}`}>
                      {place.name}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                      {place.category}
                    </span>
                    {item.completed_at ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass}`}>
                        Done
                      </span>
                    ) : null}
                  </div>
                )}
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
