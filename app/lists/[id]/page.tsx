export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ListDetailPanel from '@/components/stitch/ListDetailPanel'
import ListShareJoinGate from '@/components/lists/ListShareJoinGate'

function JoinFallback() {
  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-700 shadow-sm">
      <p className="font-medium">Loading…</p>
    </div>
  )
}

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rawToken = searchParams.token
  const token =
    typeof rawToken === 'string'
      ? rawToken
      : Array.isArray(rawToken)
        ? rawToken[0]
        : undefined
  const hasToken = Boolean(token?.trim())

  if (!user && !hasToken) {
    const nextPath = `/lists/${params.id}`
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`)
  }

  const showJoinGate = hasToken
  /** Logged-in users see the panel even while a share token is consumed (join may redirect). */
  const showPanel = Boolean(user)

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <a className="text-sm underline text-gray-700" href="/lists">
            ← Back to lists
          </a>
          <h1 className="mt-2 text-2xl font-semibold">List detail</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review everything saved in this list.
          </p>
        </div>

        {showJoinGate ? (
          <Suspense fallback={<JoinFallback />}>
            <ListShareJoinGate listId={params.id} />
          </Suspense>
        ) : null}

        {showPanel ? <ListDetailPanel listId={params.id} /> : null}
      </div>
    </main>
  )
}
