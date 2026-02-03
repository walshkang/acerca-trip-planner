'use client'

import { useEffect, useState } from 'react'

export default function PlaceUserMetaForm(props: {
  placeId: string
  initialNotes: string | null
  tone?: 'light' | 'dark'
}) {
  const [notes, setNotes] = useState(props.initialNotes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isDark = props.tone === 'dark'
  const labelClass = isDark ? 'text-slate-200' : 'text-gray-700'
  const textareaClass = isDark
    ? 'glass-input w-full text-sm min-h-[96px]'
    : 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900'
  const saveButtonClass = isDark
    ? 'glass-button rounded-md px-3 py-2 text-xs disabled:opacity-60'
    : 'rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60'
  const savedClass = isDark ? 'text-emerald-300' : 'text-green-700'
  const errorClass = isDark ? 'text-red-300' : 'text-red-600'

  useEffect(() => {
    setNotes(props.initialNotes ?? '')
  }, [props.initialNotes])

  function resetStatus() {
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage(null)
    }
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
