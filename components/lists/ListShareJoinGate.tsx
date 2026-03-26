'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type JoinResponse = {
  list_id?: string
  permission?: string
  already_owner?: boolean
  error?: string
}

export default function ListShareJoinGate({ listId }: { listId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const didRun = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'joining' | 'done'>('idle')

  useEffect(() => {
    if (!token?.trim()) return
    if (didRun.current) return
    didRun.current = true
    setPhase('joining')
    void fetch('/api/lists/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    })
      .then(async (res) => {
        const data = (await res.json()) as JoinResponse
        if (!res.ok) {
          setError(
            data.error ??
              (res.status === 410
                ? 'This link has expired.'
                : 'This link is invalid or expired.')
          )
          setPhase('idle')
          return
        }
        const id = data.list_id ?? listId
        if (id) {
          setPhase('done')
          router.replace(`/?list=${encodeURIComponent(id)}`)
        } else {
          setError('Could not join this trip.')
          setPhase('idle')
        }
      })
      .catch(() => {
        setError('Could not join this trip.')
        setPhase('idle')
      })
  }, [token, listId, router])

  if (!token?.trim()) return null

  if (error) {
    return (
      <div
        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {error}
      </div>
    )
  }

  if (phase === 'joining' || phase === 'done') {
    return (
      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-700 shadow-sm">
        <p className="font-medium">Joining trip…</p>
        <p className="mt-1 text-xs text-gray-500">Taking you to the app.</p>
      </div>
    )
  }

  return null
}
