'use client'

import { useMemo, useState } from 'react'

export default function PlaceUserMetaForm(props: {
  placeId: string
  initialNotes: string | null
  initialTags: string[] | null
}) {
  const initialTagsText = useMemo(
    () => (props.initialTags ?? []).join(', '),
    [props.initialTags]
  )

  const [notes, setNotes] = useState(props.initialNotes ?? '')
  const [tagsText, setTagsText] = useState(initialTagsText)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMessage(null)

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 50)

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
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Your notes…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tags (comma-separated)
        </label>
        <input
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="date-night, work-friendly, kid-friendly"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={status === 'saving'}
      >
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {status === 'saved' ? (
        <p className="text-sm text-green-700">Saved.</p>
      ) : null}

      {status === 'error' ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </form>
  )
}

