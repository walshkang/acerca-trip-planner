'use client'

import { useEffect, useMemo, useState } from 'react'

export default function PlaceUserMetaForm(props: {
  placeId: string
  initialNotes: string | null
  initialTags: string[] | null
  tone?: 'light' | 'dark'
}) {
  const [notes, setNotes] = useState(props.initialNotes ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(props.initialTags ?? [])
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isDark = props.tone === 'dark'
  const labelClass = isDark ? 'text-slate-200' : 'text-gray-700'
  const helperClass = isDark ? 'text-slate-400' : 'text-gray-500'
  const inputClass = isDark
    ? 'glass-input w-full text-sm'
    : 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'
  const textareaClass = isDark
    ? 'glass-input w-full text-sm min-h-[96px]'
    : 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'
  const chipClass = isDark
    ? 'border-white/10 text-slate-200'
    : 'border-gray-200 text-gray-700'
  const chipButtonClass = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : 'text-gray-400 hover:text-gray-600'
  const clearClass = isDark ? 'text-slate-300 underline' : 'text-gray-500 underline'
  const addButtonClass = isDark
    ? 'glass-button rounded-md px-3 py-2 text-xs disabled:opacity-50'
    : 'rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700 disabled:opacity-50'
  const saveButtonClass = isDark
    ? 'glass-button rounded-md px-3 py-2 text-xs disabled:opacity-60'
    : 'rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60'
  const savedClass = isDark ? 'text-emerald-300' : 'text-green-700'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'

  const initialKey = useMemo(
    () => (props.initialTags ?? []).join('|'),
    [props.initialTags]
  )

  useEffect(() => {
    setTags(props.initialTags ?? [])
    setTagInput('')
  }, [initialKey])

  function resetStatus() {
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage(null)
    }
  }

  function parseTagInput(input: string) {
    return input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 50)
  }

  function addTags() {
    const next = parseTagInput(tagInput)
    if (!next.length) return
    setTags((prev) => {
      const seen = new Set(prev.map((t) => t.toLowerCase()))
      const merged = [...prev]
      for (const tag of next) {
        const key = tag.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(tag)
        if (merged.length >= 50) break
      }
      return merged
    })
    setTagInput('')
    resetStatus()
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
    resetStatus()
  }

  function clearTags() {
    setTags([])
    resetStatus()
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMessage(null)

    const res = await fetch(`/api/places/${props.placeId}/user-meta`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_notes: notes.length ? notes : null,
        user_tags: tags.length ? tags : null,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      setStatus('error')
      setErrorMessage(text || `Save failed (HTTP ${res.status})`)
      return
    }

    setStatus('saved')
  }

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div>
        <label className={`block text-sm font-medium ${labelClass}`}>Notes</label>
        <textarea
          className={`mt-1 ${textareaClass}`}
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            resetStatus()
          }}
          placeholder="Your notes…"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${labelClass}`}>Tags</label>
        <p className={`mt-1 text-xs ${helperClass}`}>
          Your labels to organize places any way you like.
        </p>
        {tags.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${chipClass}`}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={`text-[11px] ${chipButtonClass}`}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearTags}
              className={`text-[11px] ${clearClass}`}
            >
              × Clear
            </button>
          </div>
        ) : (
          <p className={`mt-2 text-xs ${helperClass}`}>No tags yet.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`flex-1 ${inputClass}`}
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value)
              resetStatus()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (tagInput.trim().length) {
                  e.preventDefault()
                  addTags()
                }
              }
            }}
            placeholder="date-night, work-friendly, kid-friendly"
          />
          <button
            type="button"
            onClick={addTags}
            disabled={!tagInput.trim().length}
            className={addButtonClass}
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="submit"
        className={saveButtonClass}
        disabled={status === 'saving'}
      >
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {status === 'saved' ? (
        <p className={`text-sm ${savedClass}`}>Saved.</p>
      ) : null}

      {status === 'error' ? (
        <p className={`text-sm ${errorClass}`}>{errorMessage}</p>
      ) : null}
    </form>
  )
}
