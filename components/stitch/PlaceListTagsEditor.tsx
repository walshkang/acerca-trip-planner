'use client'

import { useEffect, useMemo, useState } from 'react'
import { normalizeTagList } from '@/lib/lists/tags'

type ListEntry = {
  list: { id: string; name: string; is_default: boolean }
  itemId: string
  tags: string[]
}

type Props = {
  entries: ListEntry[]
  tone?: 'light' | 'dark'
}

function ListTagEditor({
  listId,
  listName,
  isDefault,
  itemId,
  initialTags,
  tone = 'dark',
}: {
  listId: string
  listName: string
  isDefault: boolean
  itemId: string
  initialTags: string[]
  tone?: 'light' | 'dark'
}) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const isDark = tone === 'dark'
  const chipClass = isDark
    ? 'border-white/10 text-slate-200'
    : 'border-gray-200 text-gray-700'
  const chipButtonClass = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : 'text-gray-400 hover:text-gray-600'
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500'
  const inputClass = isDark
    ? 'glass-input flex-1 text-xs'
    : 'flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700'
  const buttonClass = isDark
    ? 'glass-button rounded-md px-2 py-1 text-[11px] disabled:opacity-60'
    : 'rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 disabled:opacity-60'
  const savedClass = isDark ? 'text-emerald-300' : 'text-green-700'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'

  useEffect(() => {
    setTags(initialTags)
    setTagInput('')
  }, [initialTags.join('|')])

  async function commitTags(nextTags: string[]) {
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}/tags`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tags: nextTags }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        item?: { tags?: string[] }
        error?: string
      }
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`)
      }
      const updated = Array.isArray(json?.item?.tags) ? json.item.tags : []
      setTags(updated)
      setTagInput('')
      setStatus('saved')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function handleAdd(event?: React.FormEvent) {
    event?.preventDefault()
    const nextAdd = normalizeTagList(tagInput)
    if (!nextAdd || !nextAdd.length) return
    const merged = normalizeTagList([...tags, ...nextAdd]) ?? []
    await commitTags(merged)
  }

  async function handleRemove(tag: string) {
    const next = tags.filter((t) => t !== tag)
    await commitTags(next)
  }

  async function handleClear() {
    await commitTags([])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-100">{listName}</p>
        {isDefault ? (
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
            Default
          </span>
        ) : null}
      </div>
      {tags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={`${listId}-${tag}`}
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
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
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
      </form>
      {status === 'saved' ? (
        <p className={`text-[11px] ${savedClass}`}>Saved.</p>
      ) : null}
      {status === 'error' ? (
        <p className={`text-[11px] ${errorClass}`}>{error}</p>
      ) : null}
    </div>
  )
}

export default function PlaceListTagsEditor({ entries, tone = 'dark' }: Props) {
  const emptyText = tone === 'dark' ? 'text-slate-400' : 'text-gray-500'
  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.list.name.localeCompare(b.list.name)
      ),
    [entries]
  )

  if (!sorted.length) {
    return (
      <p className={`text-xs ${emptyText}`}>
        Add this place to a list to edit tags.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((entry) => (
        <ListTagEditor
          key={entry.list.id}
          listId={entry.list.id}
          listName={entry.list.name}
          isDefault={entry.list.is_default}
          itemId={entry.itemId}
          initialTags={entry.tags}
          tone={tone}
        />
      ))}
    </div>
  )
}
