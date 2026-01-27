'use client'

import { useState } from 'react'

export default function IngestForm() {
  const [input, setInput] = useState('')
  const [includeWikipedia, setIncludeWikipedia] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreatedId(null)
    setLoading(true)
    try {
      const res = await fetch('/api/places/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, include_wikipedia: includeWikipedia }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`)
        return
      }
      setCreatedId(json?.candidate?.id ?? null)
      setInput('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900">
          Input
        </label>
        <textarea
          className="mt-2 w-full rounded-md border border-gray-200 p-3 text-sm"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Google Maps URL, Place ID (ChI...), or name"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={includeWikipedia}
          onChange={(e) => setIncludeWikipedia(e.target.checked)}
        />
        Include Wikipedia/Wikidata fetch
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Ingesting…' : 'Ingest'}
        </button>
        <a className="text-sm underline text-gray-700" href="/candidates">
          View candidates
        </a>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      {createdId ? (
        <p className="text-sm text-green-700">
          Created candidate: <span className="font-mono">{createdId}</span>
        </p>
      ) : null}
    </form>
  )
}

