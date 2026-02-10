'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { getCategoryIcon } from '@/lib/icons/mapping'
import type { ListFilterFieldErrors } from '@/lib/lists/filters'
import { normalizeTagList } from '@/lib/lists/tags'
import type { CategoryEnum } from '@/lib/types/enums'
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
  appliedTypeFilters?: CategoryEnum[]
  onTypeFilterToggle?: (type: CategoryEnum) => void
  onClearTypeFilters?: () => void
  availableTags?: string[]
  activeTagFilters?: string[]
  appliedTagFilters?: string[]
  onTagFilterToggle?: (tag: string) => void
  onClearTagFilters?: () => void
  onClearAllFilters?: () => void
  onApplyFilters?: () => void
  onResetFilters?: () => void
  isFilterDirty?: boolean
  isApplyingFilters?: boolean
  applyDisabled?: boolean
  resetDisabled?: boolean
  filterFieldErrors?: ListFilterFieldErrors | null
  filterErrorMessage?: string | null
  filterIntent?: string
  onFilterIntentChange?: (next: string) => void
  onTranslateIntent?: () => void
  isTranslatingIntent?: boolean
  translateIntentDisabled?: boolean
  translateIntentError?: string | null
  translateIntentHint?: string | null
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

  const updateTags = onTagsUpdate
  if (!updateTags) return null

  const commitTags = async (nextTags: string[]) => {
    setStatus('saving')
    setError(null)
    try {
      const updated = await updateTags(itemId, nextTags)
      setChipTags(updated)
      setTagInput('')
      setStatus('saved')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const normalizeMergedTags = (tagsToMerge: string[]) => {
    return normalizeTagList(tagsToMerge) ?? []
  }

  const handleAdd = async (event?: FormEvent) => {
    event?.preventDefault()
    const nextAdd = normalizeTagList(tagInput)
    if (!nextAdd || !nextAdd.length) return
    const merged = normalizeMergedTags([...chipTags, ...nextAdd])
    await commitTags(merged)
  }

  const handleRemove = async (tag: string) => {
    const next = chipTags.filter((t) => t !== tag)
    await commitTags(next)
  }

  const handleClear = async () => {
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
  appliedTypeFilters = [],
  onTypeFilterToggle,
  onClearTypeFilters,
  availableTags = [],
  activeTagFilters = [],
  appliedTagFilters = [],
  onTagFilterToggle,
  onClearTagFilters,
  onClearAllFilters,
  onApplyFilters,
  onResetFilters,
  isFilterDirty = false,
  isApplyingFilters = false,
  applyDisabled = false,
  resetDisabled = false,
  filterFieldErrors = null,
  filterErrorMessage = null,
  filterIntent = '',
  onFilterIntentChange,
  onTranslateIntent,
  isTranslatingIntent = false,
  translateIntentDisabled = false,
  translateIntentError = null,
  translateIntentHint = null,
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
  const actionPrimaryClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60'
    : 'rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:opacity-60'
  const actionSecondaryClass = isDark
    ? 'rounded-md border border-white/20 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50'
    : 'rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-50'
  const intentInputClass = isDark
    ? 'glass-input flex-1 text-xs'
    : 'flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700'
  const intentButtonClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60'
    : 'rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:opacity-60'
  const showFilters =
    availableTypes.length > 0 ||
    availableTags.length > 0 ||
    activeTypeFilters.length > 0 ||
    activeTagFilters.length > 0
  const isTypeFiltering = activeTypeFilters.length > 0
  const hasAnyDraftFilters =
    activeTypeFilters.length > 0 || activeTagFilters.length > 0
  const focusedRowClass = isDark
    ? `border-white/60 bg-white/5 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`
    : `border-slate-200/80 bg-gray-50 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`

  const selectedFilterChips = useMemo(() => {
    const chips: Array<{ kind: 'type' | 'tag'; label: string }> = []
    for (const type of activeTypeFilters) {
      chips.push({ kind: 'type', label: type })
    }
    for (const tag of activeTagFilters) {
      chips.push({ kind: 'tag', label: tag })
    }
    return chips
  }, [activeTagFilters, activeTypeFilters])

  const categoryErrors = filterFieldErrors?.categories ?? []
  const tagErrors = filterFieldErrors?.tags ?? []
  const payloadErrors = filterFieldErrors?.payload ?? []
  const filterSummaryError = filterErrorMessage ?? payloadErrors[0] ?? null

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
              {list.name}
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

        {!loading && !items.length && hasAnyDraftFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeTagFilters.length && onClearTagFilters ? (
              <button
                type="button"
                className={actionSecondaryClass}
                onClick={() => onClearTagFilters()}
              >
                Clear Tags
              </button>
            ) : null}
            {activeTypeFilters.length && onClearTypeFilters ? (
              <button
                type="button"
                className={actionSecondaryClass}
                onClick={() => onClearTypeFilters()}
              >
                Clear Categories
              </button>
            ) : null}
            {onResetFilters ? (
              <button
                type="button"
                className={actionSecondaryClass}
                onClick={onResetFilters}
                disabled={resetDisabled}
              >
                Reset to Applied
              </button>
            ) : null}
          </div>
        ) : null}

        {showFilters ? (
          <div className="space-y-4">
            <div className="rounded-md border border-white/10 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className={`text-[11px] font-semibold ${bodyText}`}>Filters</p>
                  <p className={`text-[11px] ${mutedText}`}>
                    {isFilterDirty
                      ? 'Draft filters pending apply.'
                      : 'Using applied canonical filters.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onClearAllFilters ? (
                    <button
                      type="button"
                      className={actionSecondaryClass}
                      onClick={onClearAllFilters}
                      disabled={!hasAnyDraftFilters || isApplyingFilters}
                    >
                      Reset
                    </button>
                  ) : null}
                  {onResetFilters ? (
                    <button
                      type="button"
                      className={actionSecondaryClass}
                      onClick={onResetFilters}
                      disabled={resetDisabled}
                    >
                      Undo
                    </button>
                  ) : null}
                  {onApplyFilters ? (
                    <button
                      type="button"
                      className={actionPrimaryClass}
                      onClick={onApplyFilters}
                      disabled={applyDisabled}
                    >
                      {isApplyingFilters
                        ? 'Applying…'
                        : isFilterDirty
                          ? 'Apply'
                          : 'Applied'}
                    </button>
                  ) : null}
                </div>
              </div>

              {onFilterIntentChange && onTranslateIntent ? (
                <div className="space-y-2">
                  <p className={`text-[11px] ${mutedText}`}>
                    Describe filters in plain language.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={filterIntent}
                      onChange={(event) =>
                        onFilterIntentChange(event.target.value)
                      }
                      placeholder="e.g., cozy coffee open now #date-night"
                      className={intentInputClass}
                      disabled={isTranslatingIntent}
                    />
                    <button
                      type="button"
                      onClick={onTranslateIntent}
                      disabled={translateIntentDisabled}
                      className={intentButtonClass}
                    >
                      {isTranslatingIntent ? 'Interpreting…' : 'Interpret'}
                    </button>
                  </div>
                  {translateIntentError ? (
                    <p className={`text-[11px] ${errorText}`}>
                      {translateIntentError}
                    </p>
                  ) : null}
                  {!translateIntentError && translateIntentHint ? (
                    <p className={`text-[11px] ${mutedText}`}>
                      {translateIntentHint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {selectedFilterChips.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedFilterChips.map((chip) => (
                    <button
                      key={`${chip.kind}:${chip.label}`}
                      type="button"
                      onClick={() => {
                        if (chip.kind === 'type') {
                          onTypeFilterToggle?.(chip.label as CategoryEnum)
                          return
                        }
                        onTagFilterToggle?.(chip.label)
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                        chip.kind === 'type' ? typeActiveClass : tagActiveClass
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                  {onClearAllFilters ? (
                    <button
                      type="button"
                      className={`text-[11px] ${mutedText} underline`}
                      onClick={onClearAllFilters}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              ) : null}

              {filterSummaryError ? (
                <p className={`text-[11px] ${errorText}`}>{filterSummaryError}</p>
              ) : null}
              {!filterSummaryError && appliedTypeFilters.length === 0 && appliedTagFilters.length === 0 ? (
                <p className={`text-[11px] ${mutedText}`}>No applied filters.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[11px] font-semibold ${bodyText}`}>
                    Place type
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>
                    A fixed category that sets this place’s map icon.
                  </p>
                </div>
                {activeTypeFilters.length && onClearTypeFilters ? (
                  <button
                    type="button"
                    className={`text-[11px] ${mutedText} underline`}
                    onClick={() => onClearTypeFilters()}
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
              {categoryErrors.map((fieldError) => (
                <p key={fieldError} className={`text-[11px] ${errorText}`}>
                  {fieldError}
                </p>
              ))}
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
                    onClick={() => onClearTagFilters()}
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
              {tagErrors.map((fieldError) => (
                <p key={fieldError} className={`text-[11px] ${errorText}`}>
                  {fieldError}
                </p>
              ))}
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
