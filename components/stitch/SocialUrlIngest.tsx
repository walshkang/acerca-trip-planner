'use client'

import { useState, type FormEvent } from 'react'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'

type Status = 'idle' | 'loading' | 'success' | 'error'

function mapFetchError(code: string | undefined): string {
  switch (code) {
    case 'platform_not_supported':
      return 'Only YouTube and blog URLs are supported'
    case 'no_transcript':
      return 'No transcript found — try a video with captions'
    case 'fetch_failed':
      return "Couldn't fetch that URL"
    case 'invalid_url':
      return 'Enter a valid URL'
    default:
      return 'Something went wrong'
  }
}

export function SocialUrlIngest() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const fetchSocialPlaces = useSocialDiscoveryStore((s) => s.fetchPlaces)
  const searchBias = useDiscoveryStore((s) => s.searchBias)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus('loading')
    setMessage('')

    const ingestKey = process.env.NEXT_PUBLIC_SOCIAL_INGEST_KEY
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Ingest-Key': ingestKey ?? '',
    }

    try {
      const fetchRes = await fetch('/api/enrichment/fetch-content', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: trimmed }),
      })
      const fetchData = (await fetchRes.json()) as {
        error?: string
        url?: string
        platform?: string
        author_name?: string
        title?: string
        transcript?: string
      }

      if (!fetchRes.ok || fetchData.error) {
        throw new Error(mapFetchError(fetchData.error))
      }

      const ingestBody = {
        url: fetchData.url,
        platform: fetchData.platform,
        author_name: fetchData.author_name,
        title: fetchData.title,
        transcript: fetchData.transcript,
        ...(searchBias
          ? { location_hint: { lat: searchBias.lat, lng: searchBias.lng } }
          : {}),
      }

      const ingestRes = await fetch('/api/enrichment/ingest-social', {
        method: 'POST',
        headers,
        body: JSON.stringify(ingestBody),
      })
      const ingestData = (await ingestRes.json()) as {
        error?: string
        places_resolved?: number
      }

      if (!ingestRes.ok || ingestData.error) {
        const errMsg =
          typeof ingestData.error === 'string' && ingestData.error.length > 0
            ? ingestData.error
            : 'Something went wrong'
        throw new Error(errMsg)
      }

      const n = ingestData.places_resolved ?? 0
      await fetchSocialPlaces()

      setStatus('success')
      setMessage(`${n} place${n !== 1 ? 's' : ''} added`)
      setUrl('')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <div className="mb-3 mt-1 border-b border-paper-tertiary-fixed px-3 pb-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          placeholder="Paste YouTube or blog URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={status === 'loading'}
          className="min-w-0 flex-1 rounded border border-paper-tertiary-fixed bg-paper-surface-warm px-3 py-1.5 text-sm text-paper-on-surface placeholder:text-paper-on-surface-variant focus:outline-none focus:ring-1 focus:ring-paper-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!url.trim() || status === 'loading'}
          className="shrink-0 rounded bg-paper-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {status === 'loading' ? '…' : 'Add'}
        </button>
      </form>
      {status === 'success' ? (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}
      {status === 'error' ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
      ) : null}
    </div>
  )
}
