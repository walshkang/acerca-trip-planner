'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type CandidateRow = {
  id: string
  name: string
  address: string | null
  status: string
  enrichment_id: string | null
  created_at: string
}

export default function CandidatesClient(props: {
  candidates: CandidateRow[]
  promoteAction: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [enriching, setEnriching] = useState<Record<string, boolean>>({})
  const [errorById, setErrorById] = useState<Record<string, string | null>>({})

  async function runEnrichment(candidateId: string) {
    setErrorById((m) => ({ ...m, [candidateId]: null }))
    setEnriching((m) => ({ ...m, [candidateId]: true }))
    try {
      const res = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, schema_version: 2 }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorById((m) => ({
          ...m,
          [candidateId]: json?.error || `HTTP ${res.status}`,
        }))
        return
      }
      router.refresh()
    } catch (e: unknown) {
      setErrorById((m) => ({
        ...m,
        [candidateId]: e instanceof Error ? e.message : 'Request failed',
      }))
    } finally {
      setEnriching((m) => ({ ...m, [candidateId]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {props.candidates.length ? (
        <div className="divide-y divide-gray-100">
          {props.candidates.map((c) => (
            <div key={c.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-gray-900">
                    {c.name}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {c.status}
                  </span>
                </div>
                {c.address ? (
                  <p className="mt-1 truncate text-sm text-gray-600">{c.address}</p>
                ) : null}
                <p className="mt-1 text-xs text-gray-500 font-mono">{c.id}</p>
                {errorById[c.id] ? (
                  <p className="mt-2 text-sm text-red-600">{errorById[c.id]}</p>
                ) : null}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runEnrichment(c.id)}
                  disabled={Boolean(enriching[c.id])}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {enriching[c.id] ? 'Enriching…' : c.enrichment_id ? 'Re-enrich' : 'Enrich'}
                </button>

                <form action={props.promoteAction}>
                  <input type="hidden" name="candidate_id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                    disabled={!c.enrichment_id}
                    title={c.enrichment_id ? '' : 'Run enrichment first'}
                  >
                    Promote
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          No candidates yet. Go to <a className="underline" href="/ingest">/ingest</a>.
        </p>
      )}
    </div>
  )
}

