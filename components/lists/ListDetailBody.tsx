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
}

function TagEditor({ itemId, tags, onTagsUpdate }: TagEditorProps) {
  const [tagInput, setTagInput] = useState('')
  const [chipTags, setChipTags] = useState(tags ?? [])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)

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
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="text-[10px] text-gray-400 hover:text-gray-600"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-gray-500 underline"
          >
            × Clear
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500">No tags yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700"
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
          className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 disabled:opacity-60"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Add'}
        </button>
      </div>
      {status === 'saved' ? (
        <p className="text-[11px] text-green-700">Saved.</p>
      ) : null}
      {status === 'error' ? (
        <p className="text-[11px] text-red-600">{error}</p>
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
}: Props) {
  const rangeLabel = useMemo(
    () => (list ? formatDateRange(list) : null),
    [list]
  )

  if (loading && !list) {
    return <p className="text-sm text-gray-500">Loading list…</p>
  }

  if (error && !list) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <section className="space-y-6">
      {list ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              <a
                className="hover:underline"
                href={`/lists/${list.id}`}
              >
                {list.name}
              </a>
            </h2>
            {list.is_default ? (
              <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                Default
              </span>
            ) : null}
          </div>
          {list.description ? (
            <p className="mt-1 text-sm text-gray-600">{list.description}</p>
          ) : null}
          {rangeLabel ? (
            <p className="mt-2 text-xs text-gray-500">Dates: {rangeLabel}</p>
          ) : null}
          {list.timezone ? (
            <p className="mt-1 text-xs text-gray-500">
              Timezone: {list.timezone}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Places</h3>
        {loading ? <p className="text-xs text-gray-500">Loading…</p> : null}
        {!loading && !items.length ? (
          <p className="text-xs text-gray-500">{emptyLabel}</p>
        ) : null}

        {availableTags.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600">
                Filter tags
              </p>
              {activeTagFilters.length && onClearTagFilters ? (
                <button
                  type="button"
                  className="text-[11px] text-gray-500 underline"
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
                      active
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600'
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
                className="rounded-md border border-gray-100 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {onPlaceSelect ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-gray-900 hover:underline"
                      onClick={() => onPlaceSelect(place.id)}
                    >
                      {place.name}
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {place.name}
                    </span>
                  )}
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                    {place.category}
                  </span>
                  {item.completed_at ? (
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                      Done
                    </span>
                  ) : null}
                </div>
                {place.address ? (
                  <p className="mt-1 text-xs text-gray-500">{place.address}</p>
                ) : null}
                <TagEditor
                  itemId={item.id}
                  tags={
                    item.tags ??
                    (item.place?.user_tags ?? [])
                  }
                  onTagsUpdate={onTagsUpdate}
                />
              </div>
            )
          })}
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </section>
  )
}
