'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/beta-access'

function BetaInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const nextRaw = searchParams.get('next')

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/'
    return safeNextPath(nextRaw, window.location.href)
  }, [nextRaw])

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/beta-unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('Wrong password')
        return
      }
      router.replace(nextPath)
      router.refresh()
    } catch {
      setError('Wrong password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold font-display text-slate-900">
          Beta access
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the beta password to continue.
        </p>

        {reason === 'expired' ? (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
            Your beta access expired; enter the password again.
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Checking…' : 'Continue'}
          </button>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  )
}

export default function BetaPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          <p className="text-sm text-slate-600">Loading…</p>
        </main>
      }
    >
      <BetaInner />
    </Suspense>
  )
}
