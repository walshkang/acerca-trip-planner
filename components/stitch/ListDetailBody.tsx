'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import EmojiPicker from '@/components/ui/EmojiPicker'
import { useCategoryIconOverrides } from '@/lib/icons/useCategoryIconOverrides'
import type { ListFilterFieldErrors } from '@/lib/lists/filters'
import { normalizeTagList } from '@/lib/lists/tags'
import {
  CATEGORY_ENUM_VALUES,
  type CategoryEnum,
  type EnergyEnum,
} from '@/lib/types/enums'
import { CATEGORY_ICON_CHOICES } from '@/lib/icons/preferences'
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
  day_index?: number | null
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
  activeEnergyFilters?: EnergyEnum[]
  openNowFilter?: boolean | null
  onEnergyFilterToggle?: (energy: EnergyEnum) => void
  onSetOpenNowFilter?: (value: boolean | null) => void
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
    ? 'glass-input flex-1 text-xs md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant'
    : 'flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant'
  const buttonClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60 md:rounded-[4px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface md:shadow-none md:backdrop-blur-none hover:md:bg-paper-tertiary-fixed'
    : 'rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 disabled:opacity-60 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface hover:md:bg-paper-tertiary-fixed'
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
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] md:rounded-[2px] md:border-paper-tertiary-fixed md:bg-paper-surface-container ${chipClass}`}
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
  activeEnergyFilters = [],
  openNowFilter = null,
  onEnergyFilterToggle,
  onSetOpenNowFilter,
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
  const {
    categoryIconOverrides,
    setCategoryIcon,
    resetCategoryIcons,
    resolveCategoryEmoji,
  } = useCategoryIconOverrides(list?.id ?? null)
  const [iconEditorOpen, setIconEditorOpen] = useState(false)
  const [pickerCategory, setPickerCategory] =
    useState<CategoryEnum | null>(null)
  const rangeLabel = useMemo(
    () => (list ? formatDateRange(list) : null),
    [list]
  )
  const isDark = tone === 'dark'
  const panelClass = isDark
    ? 'border-white/10 bg-slate-900/40'
    : 'border-gray-200 bg-white md:border-paper-tertiary-fixed md:bg-paper-surface-warm md:rounded-[4px]'
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
  const filterChipInactiveMd =
    'md:rounded-[2px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:text-paper-on-surface hover:md:bg-white'
  const filterChipActiveMd =
    'md:!border-paper-on-surface md:!bg-paper-on-surface md:!text-paper-surface'
  const rowBorder = isDark ? 'border-white/10' : 'border-gray-100'
  const errorText = isDark ? 'text-red-300' : 'text-red-600'
  const actionPrimaryMd =
    'md:!rounded-[4px] md:!border-0 md:!bg-paper-primary md:!text-paper-on-primary md:px-3 md:py-1.5 md:font-bold md:uppercase md:tracking-widest hover:md:!bg-paper-primary-container md:shadow-none md:backdrop-blur-none'
  const actionPrimaryClass = isDark
    ? `glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60 ${actionPrimaryMd}`
    : `rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:opacity-60 ${actionPrimaryMd}`
  const actionSecondaryMd =
    'md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface hover:md:bg-paper-tertiary-fixed'
  const actionSecondaryClass = isDark
    ? `rounded-md border border-white/20 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50 ${actionSecondaryMd}`
    : `rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-50 ${actionSecondaryMd}`
  const intentInputClass = isDark
    ? 'glass-input flex-1 text-xs md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:backdrop-blur-none md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant'
    : 'flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:text-paper-on-surface md:placeholder:text-paper-on-surface-variant'
  const intentButtonClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60 md:rounded-[4px] md:border md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface md:shadow-none md:backdrop-blur-none hover:md:bg-paper-tertiary-fixed'
    : 'rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 disabled:opacity-60 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container-low md:text-paper-on-surface hover:md:bg-paper-tertiary-fixed'
  const showFilters =
    availableTypes.length > 0 ||
    availableTags.length > 0 ||
    activeTypeFilters.length > 0 ||
    activeTagFilters.length > 0 ||
    activeEnergyFilters.length > 0 ||
    openNowFilter !== null
  const isTypeFiltering = activeTypeFilters.length > 0
  const hasAnyDraftFilters =
    activeTypeFilters.length > 0 ||
    activeTagFilters.length > 0 ||
    activeEnergyFilters.length > 0 ||
    openNowFilter !== null
  const focusedRowClass = isDark
    ? `border-white/60 bg-white/5 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`
    : `border-slate-200/80 bg-gray-50 animate-[pulse_1.2s_ease-in-out_1] ${PLACE_FOCUS_GLOW}`
  const iconEditorPanelClass = isDark
    ? 'mt-3 space-y-2 rounded-md border border-white/10 bg-white/5 p-3'
    : 'mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50/80 p-3'
  const iconActionClass = isDark
    ? 'rounded-md border border-white/20 px-2 py-1 text-[11px] text-slate-200 hover:border-white/35'
    : 'rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:border-slate-500'
  const hasCustomListIcons = Object.keys(categoryIconOverrides).length > 0

  const selectedFilterChips = useMemo(() => {
    const chips: Array<{
      kind: 'type' | 'tag' | 'energy' | 'open_now'
      label: string
      value?: EnergyEnum
    }> = []
    for (const type of activeTypeFilters) {
      chips.push({ kind: 'type', label: type })
    }
    for (const tag of activeTagFilters) {
      chips.push({ kind: 'tag', label: tag })
    }
    for (const energy of activeEnergyFilters) {
      chips.push({
        kind: 'energy',
        label: `Energy: ${energy}`,
        value: energy,
      })
    }
    if (openNowFilter !== null) {
      chips.push({
        kind: 'open_now',
        label: openNowFilter ? 'Open now' : 'Closed now',
      })
    }
    return chips
  }, [activeEnergyFilters, activeTagFilters, activeTypeFilters, openNowFilter])

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

  useEffect(() => {
    setIconEditorOpen(false)
    setPickerCategory(null)
  }, [list?.id])

  const beginIconEdit = (category: CategoryEnum) => {
    setIconEditorOpen(true)
    setPickerCategory(category)
  }

  const clearListIcon = (category: CategoryEnum) => {
    setCategoryIcon(category, null)
    if (pickerCategory === category) {
      setPickerCategory(null)
    }
  }

  if (loading && !list) {
    return <p className={`text-sm ${mutedText}`}>Loading list…</p>
  }

  if (error && !list) {
    return <p className={`text-sm ${errorText}`}>{error}</p>
  }

  return (
    <section className="space-y-6">
      {list ? (
        <div className={`rounded-lg border p-4 md:rounded-[4px] ${panelClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className={`text-lg font-semibold md:font-headline md:font-extrabold md:uppercase md:tracking-tighter ${titleClass}`}
            >
              {list.name}
            </h2>
            {list.is_default ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] md:rounded-[2px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:text-[10px] md:font-bold md:uppercase md:tracking-wider ${chipClass}`}
              >
                Default
              </span>
            ) : null}
          </div>
          {list.description ? (
            <p className={`mt-1 text-sm md:font-body ${bodyText}`}>{list.description}</p>
          ) : null}
          {rangeLabel ? (
            <p className={`mt-2 text-xs ${mutedText}`}>Dates: {rangeLabel}</p>
          ) : null}
          {list.timezone ? (
            <p className={`mt-1 text-xs ${mutedText}`}>
              Timezone: {list.timezone}
            </p>
          ) : null}
          <div className={iconEditorPanelClass}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-[11px] font-semibold ${bodyText}`}>
                Type icons (this list)
              </p>
              <div className="flex items-center gap-2">
                {hasCustomListIcons ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetCategoryIcons()
                      setPickerCategory(null)
                    }}
                    className={`text-[11px] underline ${mutedText}`}
                  >
                    Reset list
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIconEditorOpen((prev) => !prev)}
                  className={iconActionClass}
                >
                  {iconEditorOpen ? 'Hide' : 'Customize'}
                </button>
              </div>
            </div>
            <p className={`text-[11px] ${mutedText}`}>
              Click Change to open emoji input for each category.
            </p>
            {iconEditorOpen ? (
              <div className="space-y-2">
                {CATEGORY_ENUM_VALUES.map((category) => {
                  const isPicking = pickerCategory === category
                  const hasOverride = Boolean(categoryIconOverrides[category])
                  return (
                    <div
                      key={`icon-${list.id}-${category}`}
                      className={`rounded-md border px-2 py-2 ${
                        isPicking
                          ? isDark
                            ? 'border-sky-300/60 bg-sky-500/10'
                            : 'border-sky-400/60 bg-sky-100/80'
                          : isDark
                          ? 'border-white/10 bg-slate-900/30'
                          : 'border-slate-200 bg-white/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span aria-hidden className="text-base leading-none">
                            {resolveCategoryEmoji(category)}
                          </span>
                          <span className={titleClass}>{category}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginIconEdit(category)}
                            className={iconActionClass}
                          >
                            {isPicking ? 'Picking…' : 'Change'}
                          </button>
                          {hasOverride ? (
                            <button
                              type="button"
                              onClick={() => clearListIcon(category)}
                              className={`text-[11px] underline ${mutedText}`}
                            >
                              Default
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={`rounded-lg border p-4 space-y-3 md:rounded-[4px] ${panelClass}`}>
        <h3
          className={`text-sm font-semibold md:font-headline md:text-xs md:font-extrabold md:uppercase md:tracking-tighter ${titleClass}`}
        >
          Places
        </h3>
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
            <div className="rounded-md border border-white/10 p-3 space-y-3 md:rounded-[4px] md:border-paper-tertiary-fixed md:bg-paper-surface-container-low">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p
                    className={`text-[11px] font-semibold md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em] ${bodyText}`}
                  >
                    Filters
                  </p>
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
                        if (chip.kind === 'tag') {
                          onTagFilterToggle?.(chip.label)
                          return
                        }
                        if (chip.kind === 'energy' && chip.value) {
                          onEnergyFilterToggle?.(chip.value)
                          return
                        }
                        if (chip.kind === 'open_now') {
                          onSetOpenNowFilter?.(null)
                        }
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] md:rounded-[2px] md:px-3 md:py-1 md:text-[11px] md:font-bold md:uppercase md:tracking-wider ${
                        chip.kind === 'type'
                          ? `${typeActiveClass} ${filterChipActiveMd}`
                          : `${tagActiveClass} ${filterChipActiveMd}`
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
              {!filterSummaryError &&
              appliedTypeFilters.length === 0 &&
              appliedTagFilters.length === 0 &&
              activeEnergyFilters.length === 0 &&
              openNowFilter === null ? (
                <p className={`text-[11px] ${mutedText}`}>No applied filters.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`text-[11px] font-semibold md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em] ${bodyText}`}
                  >
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
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] md:rounded-[2px] md:px-3 md:py-1 md:font-bold md:uppercase md:tracking-wider ${
                          active
                            ? `${typeActiveClass} ${filterChipActiveMd}`
                            : `${typeInactiveClass} ${filterChipInactiveMd}`
                        } ${
                          isTypeFiltering && !active ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        <span aria-hidden className="text-[13px] leading-none">
                          {resolveCategoryEmoji(type)}
                        </span>
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
                  <p
                    className={`text-[11px] font-semibold md:text-[10px] md:font-bold md:uppercase md:tracking-[0.2em] ${bodyText}`}
                  >
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
                        className={`rounded-full border px-2 py-0.5 text-[11px] md:rounded-[2px] md:px-3 md:py-1 md:font-bold md:uppercase md:tracking-wider ${
                          active
                            ? `${tagActiveClass} ${filterChipActiveMd}`
                            : `${tagInactiveClass} ${filterChipInactiveMd}`
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

        <div className="space-y-3 md:space-y-0 md:divide-y-0">
          {items.map((item) => {
            const place = item.place
            if (!place) return null
            const isFocused = focusedPlaceId === place.id
            const rowChipMd =
              'md:rounded-[2px] md:border-paper-tertiary-fixed md:bg-paper-surface-container md:text-[10px] md:font-bold md:uppercase md:tracking-wider md:text-paper-on-surface-variant'
            return (
              <div
                key={item.id}
                data-place-id={place.id}
                className={`rounded-md border px-3 py-2 ${rowBorder} md:rounded-none md:border-0 md:border-b md:border-dotted md:border-paper-tertiary-fixed md:px-0 md:py-3 md:last:border-b-0 ${
                  isFocused ? `${focusedRowClass} md:!border-paper-primary` : ''
                }`}
              >
                {onPlaceSelect ? (
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-2 text-left md:items-start md:gap-3"
                    onClick={() => onPlaceSelect(place.id)}
                  >
                    <span
                      aria-hidden
                      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-paper-tertiary-fixed bg-paper-surface-container text-base leading-none md:inline-flex"
                    >
                      {resolveCategoryEmoji(place.category)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className={`text-sm font-medium hover:underline md:font-headline md:font-extrabold md:uppercase md:tracking-tight ${titleClass}`}
                      >
                        {place.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass} ${rowChipMd}`}
                        >
                          {place.category}
                        </span>
                        {item.completed_at ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass} ${rowChipMd}`}
                          >
                            Done
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 md:items-start md:gap-3">
                    <span
                      aria-hidden
                      className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-paper-tertiary-fixed bg-paper-surface-container text-base leading-none md:inline-flex"
                    >
                      {resolveCategoryEmoji(place.category)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className={`text-sm font-medium md:font-headline md:font-extrabold md:uppercase md:tracking-tight ${titleClass}`}
                      >
                        {place.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass} ${rowChipMd}`}
                        >
                          {place.category}
                        </span>
                        {item.completed_at ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${chipClass} ${rowChipMd}`}
                          >
                            Done
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
                )}
                {place.address ? (
                  <p
                    className={`mt-1 text-xs md:text-[11px] md:text-paper-on-surface-variant ${mutedText}`}
                  >
                    {place.address}
                  </p>
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

      <EmojiPicker
        open={Boolean(iconEditorOpen && pickerCategory)}
        title={
          pickerCategory
            ? `Choose icon for ${pickerCategory}`
            : 'Choose icon'
        }
        suggestedEmojis={
          pickerCategory ? CATEGORY_ICON_CHOICES[pickerCategory] : []
        }
        includeCatalog={false}
        restrictToOptions={false}
        onClose={() => setPickerCategory(null)}
        onSelect={(emoji) => {
          if (!pickerCategory) return
          setCategoryIcon(pickerCategory, emoji)
          setPickerCategory(null)
        }}
      />
    </section>
  )
}
