'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { precheckSocialIngestUrl } from '@/lib/social/social-ingest-url'
import { useDiscoveryStore } from '@/lib/state/useDiscoveryStore'
import { useSocialDiscoveryStore } from '@/lib/state/useSocialDiscoveryStore'

type Status = 'idle' | 'loading' | 'success' | 'error'

type SocialIngestJobRow = {
  status: string
  progress_message?: string | null
  error_message?: string | null
  places_resolved?: number | null
  source_id?: string | null
}

function mapJobErrorMessage(msg: string | null | undefined): string {
  switch (msg) {
    case 'platform_not_supported':
      return 'Only YouTube and blog URLs are supported'
    case 'no_transcript':
      return 'No transcript found — try a video with captions'
    case 'fetch_failed':
      return "Couldn't fetch that URL"
    case 'invalid_url':
      return 'Enter a valid URL'
    default:
      return msg?.trim() || 'Ingest failed'
  }
}

export type SocialUrlIngestProps = {
  /** Hide the green “N places added” line (Sources workspace shows feedback on cards). */
  hideSuccessBanner?: boolean
  /** Called after ingest succeeds and user-sources POST completes (if applicable). */
  onIngestSuccess?: () => void | Promise<void>
  dataTestIdUrlInput?: string
}

export function SocialUrlIngest({
  hideSuccessBanner = false,
  onIngestSuccess,
  dataTestIdUrlInput,
}: SocialUrlIngestProps = {}) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [runningMessage, setRunningMessage] = useState<string>('Processing...')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const terminalHandledRef = useRef(false)

  const fetchSocialPlaces = useSocialDiscoveryStore((s) => s.fetchPlaces)
  const searchBias = useDiscoveryStore((s) => s.searchBias)

  const handleJobTerminal = useCallback(
    async (row: SocialIngestJobRow) => {
      if (terminalHandledRef.current) return
      terminalHandledRef.current = true
      setActiveJobId(null)

      if (row.status === 'failed') {
        setStatus('error')
        setMessage(mapJobErrorMessage(row.error_message))
        setTimeout(() => setStatus('idle'), 5000)
        return
      }

      if (row.status !== 'succeeded') {
        setStatus('error')
        setMessage('Unexpected job state')
        setTimeout(() => setStatus('idle'), 5000)
        return
      }

      try {
        await fetchSocialPlaces()

        if (typeof row.source_id === 'string' && row.source_id.length > 0) {
          await fetch('/api/enrichment/user-sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: row.source_id }),
            credentials: 'same-origin',
          })
        }

        await onIngestSuccess?.()

        const n = row.places_resolved ?? 0
        setUrl('')

        if (hideSuccessBanner) {
          setStatus('idle')
        } else {
          setStatus('success')
          setMessage(`${n} place${n !== 1 ? 's' : ''} added`)
          setTimeout(() => setStatus('idle'), 4000)
        }
      } catch {
        setStatus('error')
        setMessage('Something went wrong')
        setTimeout(() => setStatus('idle'), 5000)
      }
    },
    [fetchSocialPlaces, hideSuccessBanner, onIngestSuccess]
  )

  useEffect(() => {
    if (!activeJobId) return

    terminalHandledRef.current = false
    const jobId = activeJobId
    const sb = getSupabase()
    setRunningMessage('Processing...')

    void fetch(`/api/enrichment/social-ingest-job/${jobId}`, {
      credentials: 'same-origin',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((row: SocialIngestJobRow | null) => {
        if (!row?.status) return
        if (row.status === 'running') {
          setRunningMessage(row.progress_message?.trim() || 'Processing...')
          return
        }
        if (row.status === 'succeeded' || row.status === 'failed') {
          void handleJobTerminal(row)
        }
      })
      .catch(() => {})

    const channel = sb
      .channel(`social_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_ingest_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as SocialIngestJobRow
          if (row.status === 'running') {
            setRunningMessage(row.progress_message?.trim() || 'Processing...')
            return
          }
          if (row.status === 'succeeded' || row.status === 'failed') {
            void handleJobTerminal(row)
          }
        }
      )
      .subscribe()

    return () => {
      void sb.removeChannel(channel)
    }
  }, [activeJobId, handleJobTerminal])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus('loading')
    setMessage('')

    const pre = precheckSocialIngestUrl(trimmed)
    if (!pre.ok) {
      setStatus('error')
      setMessage(mapJobErrorMessage(pre.code))
      setTimeout(() => setStatus('idle'), 5000)
      return
    }

    try {
      const res = await fetch('/api/enrichment/enqueue-social-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          url: trimmed,
          ...(searchBias
            ? { location_hint: { lat: searchBias.lat, lng: searchBias.lng } }
            : {}),
        }),
      })

      const data = (await res.json()) as { job_id?: string; error?: string }

      if (!res.ok || !data.job_id) {
        throw new Error(
          typeof data.error === 'string' && data.error.length > 0
            ? data.error
            : 'Could not start ingest'
        )
      }

      terminalHandledRef.current = false
      setStatus('idle')
      setRunningMessage('Processing...')
      setActiveJobId(data.job_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        setStatus('error')
        setMessage('Sign in to add places from a URL')
        setTimeout(() => setStatus('idle'), 5000)
        return
      }
      setStatus('error')
      setMessage(msg)
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const loading = status === 'loading' || activeJobId !== null

  return (
    <div className="mb-3 mt-1 border-b border-paper-tertiary-fixed px-3 pb-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          placeholder="Paste YouTube or blog URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          data-testid={dataTestIdUrlInput}
          className="min-w-0 flex-1 rounded border border-paper-tertiary-fixed bg-paper-surface-warm px-3 py-1.5 text-sm text-paper-on-surface placeholder:text-paper-on-surface-variant focus:outline-none focus:ring-1 focus:ring-paper-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="shrink-0 rounded bg-paper-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? '…' : 'Add'}
        </button>
      </form>
      {loading && activeJobId ? (
        <p className="mt-1 text-xs text-paper-on-surface-variant">{runningMessage}</p>
      ) : null}
      {status === 'success' && !hideSuccessBanner ? (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}
      {status === 'error' ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
      ) : null}
    </div>
  )
}
