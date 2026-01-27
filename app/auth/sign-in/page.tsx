'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

function SignInInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = useMemo(() => searchParams.get('next') ?? '/', [searchParams])

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage(null)

    const origin =
      typeof window !== 'undefined' ? window.location.origin : undefined
    if (!origin) {
      setStatus('error')
      setErrorMessage('Unable to determine site origin.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  async function onAlreadySignedIn() {
    router.push(next)
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Get a magic link in your email.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <button
            className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={status === 'sending' || status === 'sent'}
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>

          {status === 'sent' ? (
            <p className="text-sm text-green-700">
              Check your email for the magic link.
            </p>
          ) : null}

          {status === 'error' ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="text-sm text-gray-700 underline"
            onClick={onAlreadySignedIn}
          >
            I’m already signed in
          </button>
        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          <p className="text-sm text-gray-600">Loading…</p>
        </main>
      }
    >
      <SignInInner />
    </Suspense>
  )
}
